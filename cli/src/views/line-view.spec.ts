import type { Choice } from "engine";
import { EngineError, GameSession } from "engine";
import { describe, expect, it } from "vitest";
import { GameController } from "../controller/game-controller.ts";
import type { PlayableEngine } from "../controller/view-model.ts";
import type { LineIO } from "./line-view.ts";
import { LineView } from "./line-view.ts";

/** FakeEngine を GameSession に包んで GameController を生成するヘルパ。 */
function controller(engine: PlayableEngine): GameController {
  return new GameController(new GameSession(engine));
}

interface FakeNode {
  texts: string[];
  choices: string[];
}

class FakeEngine implements PlayableEngine {
  private textQueue: string[] = [];
  private choices: Choice[] = [];
  private readonly variables: Record<string, unknown>;
  public readonly chosen: number[] = [];
  private cursor = 0;

  constructor(
    private readonly nodes: FakeNode[],
    variables: Record<string, unknown> = {},
    private readonly publicVariables: Record<string, unknown> = {},
  ) {
    this.variables = { ...variables };
    this.loadNode(0);
  }

  private loadNode(index: number): void {
    const node = this.nodes[index];
    this.textQueue = [...node.texts];
    this.choices = node.choices.map((text, i) => ({ index: i, text }));
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
    if (!(name in this.variables)) throw new EngineError(`Failed to set variable: ${name}`);
    this.variables[name] = value;
  }
  getVariables(): Record<string, unknown> {
    return { ...this.variables };
  }
  getPublicVariables(): Record<string, unknown> {
    return { ...this.publicVariables };
  }
  getState(): string {
    return JSON.stringify({ cursor: this.cursor, chosen: this.chosen });
  }
  loadState(json: string): void {
    const s = JSON.parse(json);
    this.cursor = s.cursor;
    this.chosen.splice(0, this.chosen.length, ...s.chosen);
    this.loadNode(this.cursor);
  }
}

/** 用意した入力列を順に返す IO フェイク。出力とエラーを配列に蓄積する。 */
class FakeIO implements LineIO {
  public readonly out: string[] = [];
  public readonly err: string[] = [];
  private index = 0;

  constructor(private readonly inputs: (string | null)[]) {}

  async prompt(): Promise<string | null> {
    return this.index >= this.inputs.length ? null : this.inputs[this.index++];
  }
  write(line: string): void {
    this.out.push(line);
  }
  writeError(line: string): void {
    this.err.push(line);
  }
  close(): void {}
}

describe("LineView", () => {
  it("本文と番号付き選択肢を表示し、番号入力で進行する", async () => {
    const engine = new FakeEngine([
      { texts: ["暗い部屋にいる。"], choices: ["扉を調べる", "待つ"] },
      { texts: ["扉が開いた。"], choices: [] },
    ]);
    const io = new FakeIO(["1"]);

    const code = await new LineView(io).run(controller(engine));

    expect(code).toBe(0);
    expect(io.out).toContain("暗い部屋にいる。");
    expect(io.out).toContain("  1) 扉を調べる\n  2) 待つ");
    expect(engine.chosen).toEqual([0]);
  });

  it("place が公開変数なら現在地ヘッダを本文の前に表示する", async () => {
    const engine = new FakeEngine(
      [
        { texts: ["広間にいる。"], choices: ["奥へ"] },
        { texts: ["最奥。"], choices: [] },
      ],
      {},
      { place: "古城の広間" },
    );
    const io = new FakeIO(["1"]);

    await new LineView(io).run(controller(engine));

    expect(io.out).toContain("【現在地: 古城の広間】");
    // ヘッダは本文の直前に出る
    expect(io.out.indexOf("【現在地: 古城の広間】")).toBeLessThan(io.out.indexOf("広間にいる。"));
  });

  it("place が公開されていなければ現在地ヘッダは出ない", async () => {
    const engine = new FakeEngine([
      { texts: ["部屋。"], choices: ["go"] },
      { texts: ["先。"], choices: [] },
    ]);
    const io = new FakeIO(["1"]);

    await new LineView(io).run(controller(engine));

    expect(io.out.some((l) => l.includes("現在地"))).toBe(false);
  });

  it("終端で終了メッセージを表示し 0 を返す", async () => {
    const io = new FakeIO([]);
    const code = await new LineView(io).run(
      controller(new FakeEngine([{ texts: ["終わり。"], choices: [] }])),
    );
    expect(code).toBe(0);
    expect(io.out).toContain("--- 物語は終わりを迎えた ---");
  });

  it("不正入力はエラーを出し再入力を促す", async () => {
    const engine = new FakeEngine([
      { texts: ["分岐。"], choices: ["A"] },
      { texts: ["先へ。"], choices: [] },
    ]);
    const io = new FakeIO(["hello", "1"]);

    await new LineView(io).run(controller(engine));

    expect(io.err.some((l) => l.includes("認識できない"))).toBe(true);
    expect(engine.chosen).toEqual([0]);
  });

  it(":get / :set が動作する", async () => {
    const engine = new FakeEngine([{ texts: ["S"], choices: ["go"] }], { hp: 100 });
    const io = new FakeIO([":get hp", ":set hp 30", ":get hp"]);

    await new LineView(io).run(controller(engine));

    expect(io.out).toContain("hp = 100");
    expect(io.out).toContain("hp = 30");
  });

  it(":quit で 0 を返す", async () => {
    const engine = new FakeEngine([{ texts: ["S"], choices: ["go"] }]);
    const io = new FakeIO([":quit"]);

    const code = await new LineView(io).run(controller(engine));

    expect(code).toBe(0);
    expect(engine.chosen).toEqual([]);
  });

  it("EOF で 0 を返す", async () => {
    const code = await new LineView(new FakeIO([null])).run(
      controller(new FakeEngine([{ texts: ["S"], choices: ["go"] }])),
    );
    expect(code).toBe(0);
  });
});
