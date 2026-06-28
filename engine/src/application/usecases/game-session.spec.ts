import { describe, expect, it } from "vitest";
import type { Choice } from "../../domain/services/scenario-engine.ts";
import { SessionError } from "../../shared/errors/session-error.ts";
import { GameSession, normalizeChoiceLabel, type PlayableEngine } from "./game-session.ts";

/** 本文と選択肢のノード列で進行を表すフェイクエンジン。 */
interface FakeNode {
  texts: string[];
  /** Ink の生 index を提示順と意図的にずらせるよう [index, label] で指定可。 */
  choices: Array<[number, string]>;
}

class FakeEngine implements PlayableEngine {
  private textQueue: string[] = [];
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
    this.choices = node.choices.map(([inkIndex, text]) => ({ index: inkIndex, text }));
  }

  canContinue(): boolean {
    return this.textQueue.length > 0;
  }
  continue(): string {
    return this.textQueue.shift() ?? "";
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

describe("normalizeChoiceLabel", () => {
  it("NFKC・角括弧/引用符除去・空白圧縮・小文字化を行う", () => {
    expect(normalizeChoiceLabel("［ Ｈｅｌｌｏ  World ］")).toBe("hello world");
    expect(normalizeChoiceLabel("「宝箱を開ける」")).toBe("宝箱を開ける");
    expect(normalizeChoiceLabel('"Quit"')).toBe("quit");
  });
});
