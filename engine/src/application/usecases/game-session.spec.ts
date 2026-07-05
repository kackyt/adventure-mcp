import { describe, expect, it } from "vitest";
import type { Choice } from "../../domain/services/scenario-engine.ts";
import { EngineError } from "../../shared/errors/engine-error.ts";
import { SessionError } from "../../shared/errors/session-error.ts";
import { GameSession, normalizeChoiceLabel, type PlayableEngine } from "./game-session.ts";

/** 本文と選択肢のノード列で進行を表すフェイクエンジン。 */
interface FakeNode {
  texts: string[];
  /** Ink の生 index を提示順と意図的にずらせるよう [index, label] で指定可。 */
  choices: Array<[number, string]>;
  /** texts の各行に付くタグ（`#` 抜き）。省略時はタグなし。 */
  tags?: string[][];
}

class FakeEngine implements PlayableEngine {
  private textQueue: string[] = [];
  private tagQueue: string[][] = [];
  private lastTags: string[] = [];
  private choices: Choice[] = [];
  public readonly chosen: number[] = [];
  private cursor = 0;

  constructor(
    private readonly nodes: FakeNode[],
    private readonly variables: Record<string, unknown> = {},
    private readonly publicStatus: string[] = [],
  ) {
    this.loadNode(0);
  }

  private loadNode(index: number): void {
    const node = this.nodes[index];
    this.textQueue = [...node.texts];
    this.tagQueue = node.texts.map((_, i) => node.tags?.[i] ?? []);
    this.lastTags = [];
    this.choices = node.choices.map(([inkIndex, text]) => ({ index: inkIndex, text }));
  }

  canContinue(): boolean {
    return this.textQueue.length > 0;
  }
  continue(): string {
    this.lastTags = this.tagQueue.shift() ?? [];
    return this.textQueue.shift() ?? "";
  }
  get currentTags(): string[] {
    return this.lastTags;
  }
  get currentChoices(): Choice[] {
    return this.choices;
  }
  chooseChoiceIndex(index: number): void {
    this.chosen.push(index);
    this.cursor += 1;
    this.loadNode(this.cursor);
  }
  getVariable(name: string): unknown {
    return name in this.variables ? this.variables[name] : null;
  }
  setVariable(name: string, value: unknown): void {
    this.variables[name] = value;
  }
  getVariables(): Record<string, unknown> {
    return { ...this.variables };
  }
  getPublicVariables(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const name of this.publicStatus) out[name] = this.variables[name];
    return out;
  }
  public savedState = "default_state";
  getState(): string {
    return this.savedState;
  }
  loadState(json: string): void {
    this.savedState = json;
  }
}

describe("GameSession", () => {
  it("初期化で最初のシーンと提示順 0..n-1 の選択肢を確定する", () => {
    const session = new GameSession(
      new FakeEngine([
        {
          texts: ["暗い部屋。", "扉と机がある。"],
          choices: [
            [3, "扉"],
            [7, "机"],
          ],
        },
      ]),
    );
    const s = session.getSituation();
    expect(s.scene).toBe("暗い部屋。\n扉と机がある。");
    expect(s.choices).toEqual([
      { index: 0, text: "扉" },
      { index: 1, text: "机" },
    ]);
    expect(s.ended).toBe(false);
  });

  it("choose は提示順 index を Ink の生 index に対応付けて選ぶ", () => {
    const engine = new FakeEngine([
      {
        texts: ["分岐。"],
        choices: [
          [3, "A"],
          [7, "B"],
        ],
      },
      { texts: ["B を選んだ。"], choices: [] },
    ]);
    const session = new GameSession(engine);
    const s = session.choose(1);
    expect(engine.chosen).toEqual([7]); // 提示順1 → Ink index 7
    expect(s.scene).toBe("B を選んだ。");
    expect(s.ended).toBe(true);
  });

  it("status は public_status 指定変数のみを含む", () => {
    const session = new GameSession(
      new FakeEngine([{ texts: ["S"], choices: [[0, "go"]] }], { hp: 100, has_key: false }, ["hp"]),
    );
    expect(session.getSituation().status).toEqual({ hp: 100 });
  });

  it("範囲外 index は状態を進めず choice_out_of_range（現在の選択肢同梱）", () => {
    const engine = new FakeEngine([{ texts: ["S"], choices: [[0, "A"]] }]);
    const session = new GameSession(engine);
    try {
      session.choose(5);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SessionError);
      const err = e as SessionError;
      expect(err.code).toBe("choice_out_of_range");
      expect(err.choices).toEqual([{ index: 0, text: "A" }]);
    }
    expect(engine.chosen).toEqual([]); // 進んでいない
  });

  it("expectedText 不一致は choice_mismatch、一致（部分包含）は通る", () => {
    const engine = new FakeEngine([
      { texts: ["S"], choices: [[0, "［宝箱を開ける］"]] },
      { texts: ["開けた。"], choices: [] },
    ]);
    const session = new GameSession(engine);

    expect(() => session.choose(0, "門を調べる")).toThrowError(SessionError);
    expect(engine.chosen).toEqual([]);

    // NFKC + 角括弧除去 + 部分一致で通る
    const s = session.choose(0, "宝箱");
    expect(s.scene).toBe("開けた。");
    expect(engine.chosen).toEqual([0]);
  });

  it("終端到達後の choose は game_already_ended", () => {
    const session = new GameSession(new FakeEngine([{ texts: ["終わり。"], choices: [] }]));
    expect(session.getSituation().ended).toBe(true);
    try {
      session.choose(0);
      expect.unreachable();
    } catch (e) {
      expect((e as SessionError).code).toBe("game_already_ended");
    }
  });

  it("get_history は各ターンの本文と選んだラベルを記録し、最新未選択は null", () => {
    const session = new GameSession(
      new FakeEngine([
        { texts: ["S1"], choices: [[0, "進む"]] },
        {
          texts: ["S2"],
          choices: [
            [0, "戻る"],
            [1, "終える"],
          ],
        },
        { texts: ["S3"], choices: [] },
      ]),
    );
    session.choose(0); // S1 で「進む」
    session.choose(1); // S2 で「終える」
    expect(session.getHistory()).toEqual({
      turns: [
        { turn: 1, scene: "S1", choice: "進む" },
        { turn: 2, scene: "S2", choice: "終える" },
        { turn: 3, scene: "S3", choice: null },
      ],
    });
  });

  it("debug アクセサで生変数を読み書きできる（CLI 用途）", () => {
    const session = new GameSession(
      new FakeEngine([{ texts: ["S"], choices: [[0, "go"]] }], { hp: 100 }),
    );
    expect(session.debug.getVariable("hp")).toBe(100);
    session.debug.setVariable("hp", 30);
    expect(session.debug.getVariables()).toEqual({ hp: 30 });
  });

  it("serialize と restore を経て状態が復元されること", () => {
    const engine1 = new FakeEngine([
      { texts: ["S1"], choices: [[0, "A"]] },
      { texts: ["S2"], choices: [[0, "B"]] },
    ]);
    const session1 = new GameSession(engine1);
    session1.choose(0); // S2 へ

    const state = session1.serialize();
    expect(state.history).toHaveLength(2);
    expect(state.currentScene).toBe("S2");
    expect(state.choices).toEqual([{ index: 0, text: "B" }]);
    expect(state.ended).toBe(false);
    expect(state.turnCounter).toBe(2);

    // 別のエンジンで復元
    const engine2 = new FakeEngine([
      { texts: ["dummy"], choices: [] },
      { texts: ["dummy"], choices: [] },
    ]);
    const session2 = GameSession.restore(engine2, state);

    // loadState が呼ばれたか
    expect(engine2.getState()).toBe(engine1.getState());

    // 状況の復元確認
    const sit = session2.getSituation();
    expect(sit.scene).toBe("S2");
    expect(sit.choices).toEqual([{ index: 0, text: "B" }]);
    expect(sit.ended).toBe(false);

    // 履歴の復元確認
    expect(session2.getHistory().turns).toHaveLength(2);
    expect(session2.getHistory().turns[0].choice).toBe("A");
  });
});

describe("GameSession 自由入力モード (#13)", () => {
  /** 入力モード（隠し継続選択肢つき）→ 判定ノード、の 2 ノード構成。 */
  function inputEngine(): FakeEngine {
    return new FakeEngine(
      [
        {
          texts: ["金庫のダイヤルが目の前にある。"],
          tags: [["input: safe_code"]],
          choices: [[4, "ダイヤルを合わせる"]],
        },
        { texts: ["留め金は動かない。"], choices: [[0, "戻る"]] },
      ],
      { safe_code: "" },
    );
  }

  it("input タグを検出すると awaitingInput=true になり、継続用選択肢は秘匿される", () => {
    const session = new GameSession(inputEngine());
    const s = session.getSituation();
    expect(s.awaitingInput).toBe(true);
    expect(s.choices).toEqual([]); // 隠し選択肢「ダイヤルを合わせる」を露出しない
    expect(s.ended).toBe(false);
  });

  it("入力待ち中の choose は状態を進めず input_required", () => {
    const engine = inputEngine();
    const session = new GameSession(engine);
    try {
      session.choose(0);
      expect.unreachable();
    } catch (e) {
      expect((e as SessionError).code).toBe("input_required");
    }
    expect(engine.chosen).toEqual([]);
  });

  it("submitInput は正規化（NFKC＋トリム）した値を変数に注入し、隠し選択肢で前進する", () => {
    const engine = inputEngine();
    const session = new GameSession(engine);
    const s = session.submitInput("　４８２３ "); // 全角数字＋前後空白
    expect(engine.getVariable("safe_code")).toBe("4823"); // 正規化のみ。正誤判定はしない
    expect(engine.chosen).toEqual([4]); // 隠し継続選択肢（Ink 生 index）で前進
    expect(s.awaitingInput).toBe(false);
    expect(s.scene).toBe("留め金は動かない。");
    expect(session.getHistory().turns[0].choice).toBe("入力: 4823");
  });

  it("入力待ちでないときの submitInput は状態を進めず input_not_allowed（現在の選択肢同梱）", () => {
    const engine = new FakeEngine([{ texts: ["分岐。"], choices: [[0, "進む"]] }]);
    const session = new GameSession(engine);
    try {
      session.submitInput("4823");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SessionError);
      const err = e as SessionError;
      expect(err.code).toBe("input_not_allowed");
      expect(err.choices).toEqual([{ index: 0, text: "進む" }]);
    }
    expect(engine.chosen).toEqual([]);
  });

  it("終端到達後の submitInput は game_already_ended", () => {
    const session = new GameSession(new FakeEngine([{ texts: ["終わり。"], choices: [] }]));
    try {
      session.submitInput("x");
      expect.unreachable();
    } catch (e) {
      expect((e as SessionError).code).toBe("game_already_ended");
    }
  });

  it("serialize / restore で入力待ち状態が保たれる", () => {
    const session1 = new GameSession(inputEngine());
    const state = session1.serialize();
    expect(state.awaitingInputVar).toBe("safe_code");

    const session2 = GameSession.restore(inputEngine(), state);
    expect(session2.getSituation().awaitingInput).toBe(true);
    expect(() => session2.choose(0)).toThrowError(SessionError);
  });

  it("旧セーブ（awaitingInputVar なし）は通常モードとして復元される", () => {
    const engine = new FakeEngine([{ texts: ["S"], choices: [[0, "A"]] }]);
    const state = new GameSession(engine).serialize();
    delete state.awaitingInputVar;
    const restored = GameSession.restore(
      new FakeEngine([{ texts: ["S"], choices: [[0, "A"]] }]),
      state,
    );
    expect(restored.getSituation().awaitingInput).toBe(false);
  });

  it("作者契約違反（継続選択肢が 1 つでない / 変数未宣言）は EngineError で落とす", () => {
    // 選択肢 0 個（終端で入力待ちは成立しない）
    expect(
      () =>
        new GameSession(
          new FakeEngine([{ texts: ["T"], tags: [["input: code"]], choices: [] }], { code: "" }),
        ),
    ).toThrowError(EngineError);
    // 選択肢 2 個（どちらで継続するか曖昧）
    expect(
      () =>
        new GameSession(
          new FakeEngine(
            [
              {
                texts: ["T"],
                tags: [["input: code"]],
                choices: [
                  [0, "A"],
                  [1, "B"],
                ],
              },
            ],
            { code: "" },
          ),
        ),
    ).toThrowError(EngineError);
    // 注入先変数が未宣言
    expect(
      () =>
        new GameSession(
          new FakeEngine([{ texts: ["T"], tags: [["input: nope"]], choices: [[0, "A"]] }]),
        ),
    ).toThrowError(EngineError);
  });

  it("input 以外のタグや書式外のタグは無視する", () => {
    const session = new GameSession(
      new FakeEngine([
        {
          texts: ["S"],
          tags: [["theme: dark", "input", "input: 1bad"]],
          choices: [[0, "A"]],
        },
      ]),
    );
    const s = session.getSituation();
    expect(s.awaitingInput).toBe(false);
    expect(s.choices).toHaveLength(1);
  });
});

describe("normalizeChoiceLabel", () => {
  it("NFKC・角括弧/引用符除去・空白圧縮・小文字化を行う", () => {
    expect(normalizeChoiceLabel("［ Ｈｅｌｌｏ  World ］")).toBe("hello world");
    expect(normalizeChoiceLabel("「宝箱を開ける」")).toBe("宝箱を開ける");
    expect(normalizeChoiceLabel('"Quit"')).toBe("quit");
  });
});
