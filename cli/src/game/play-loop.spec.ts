import type { Choice } from "engine";
import { EngineError } from "engine";
import { describe, expect, it } from "vitest";
import { type GameIO, type PlayableEngine, runGame } from "./play-loop.ts";

/**
 * テスト用のフェイクエンジン。
 * 「本文の連なり」と「各時点での選択肢」を表すノードのリストで進行を表現する。
 */
interface FakeNode {
  texts: string[];
  choices: string[];
}

class FakeEngine implements PlayableEngine {
  private textQueue: string[] = [];
  private choices: Choice[] = [];
  private readonly variables: Record<string, unknown>;
  /** chooseChoiceIndex に渡された選択肢を、テスト検証用に記録する。 */
  public readonly chosen: number[] = [];

  constructor(
    private readonly nodes: FakeNode[],
    variables: Record<string, unknown> = {},
  ) {
    this.variables = { ...variables };
    this.loadNode(0);
    this.cursor = 0;
  }

  private cursor = 0;

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
    if (!(name in this.variables)) {
      throw new EngineError(`Failed to set variable: ${name}`);
    }
    this.variables[name] = value;
  }
}

/** あらかじめ用意した入力列を順に返す IO フェイク。出力とエラーは配列に蓄積する。 */
class FakeIO implements GameIO {
  public readonly out: string[] = [];
  public readonly err: string[] = [];
  private index = 0;

  constructor(private readonly inputs: (string | null)[]) {}

  async prompt(): Promise<string | null> {
    if (this.index >= this.inputs.length) {
      return null; // 入力が尽きたら EOF 扱い
    }
    return this.inputs[this.index++];
  }

  write(line: string): void {
    this.out.push(line);
  }

  writeError(line: string): void {
    this.err.push(line);
  }
}

describe("runGame", () => {
  it("本文を表示し、選択肢を 1 始まりの番号で提示する", async () => {
    const engine = new FakeEngine([
      { texts: ["暗い部屋にいる。"], choices: ["扉を調べる", "待つ"] },
      { texts: ["扉が開いた。"], choices: [] },
    ]);
    const io = new FakeIO(["1"]);

    const code = await runGame(engine, io);

    expect(code).toBe(0);
    expect(io.out).toContain("暗い部屋にいる。");
    expect(io.out).toContain("  1) 扉を調べる\n  2) 待つ");
    expect(engine.chosen).toEqual([0]);
  });

  it("終端に達すると終了メッセージを表示し終了コード 0 を返す", async () => {
    const engine = new FakeEngine([{ texts: ["終わり。"], choices: [] }]);
    const io = new FakeIO([]);

    const code = await runGame(engine, io);

    expect(code).toBe(0);
    expect(io.out).toContain("--- 物語は終わりを迎えた ---");
  });

  it("範囲外の番号はエラーを表示して再入力を促す", async () => {
    const engine = new FakeEngine([
      { texts: ["分岐。"], choices: ["A", "B"] },
      { texts: ["先へ。"], choices: [] },
    ]);
    const io = new FakeIO(["9", "2"]);

    const code = await runGame(engine, io);

    expect(code).toBe(0);
    expect(io.err.some((line) => line.includes("範囲外"))).toBe(true);
    expect(engine.chosen).toEqual([1]);
  });

  it("数値以外の不正入力はエラーを表示して再入力を促す", async () => {
    const engine = new FakeEngine([
      { texts: ["分岐。"], choices: ["A"] },
      { texts: ["先へ。"], choices: [] },
    ]);
    const io = new FakeIO(["hello", "1"]);

    await runGame(engine, io);

    expect(io.err.some((line) => line.includes("認識できない"))).toBe(true);
    expect(engine.chosen).toEqual([0]);
  });

  it(":get で変数値を表示する", async () => {
    const engine = new FakeEngine([{ texts: ["開始。"], choices: ["進む"] }], { player_hp: 100 });
    const io = new FakeIO([":get player_hp"]);

    await runGame(engine, io);

    expect(io.out).toContain("player_hp = 100");
  });

  it(":get で存在しない変数はエラーを表示し、プレイを継続できる", async () => {
    const engine = new FakeEngine([
      { texts: ["開始。"], choices: ["進む"] },
      { texts: ["次。"], choices: [] },
    ]);
    const io = new FakeIO([":get unknown_var", "1"]);

    const code = await runGame(engine, io);

    expect(code).toBe(0);
    expect(io.err.some((line) => line.includes("変数が見つかりません"))).toBe(true);
    expect(engine.chosen).toEqual([0]);
  });

  it(":set で変数を更新し、以降の取得に反映される", async () => {
    const engine = new FakeEngine([{ texts: ["開始。"], choices: ["進む"] }], { player_hp: 100 });
    const io = new FakeIO([":set player_hp 50", ":get player_hp"]);

    await runGame(engine, io);

    expect(io.out).toContain("player_hp = 50");
  });

  it(":set で存在しない変数はエラーを表示し、プレイを継続できる", async () => {
    const engine = new FakeEngine([
      { texts: ["開始。"], choices: ["進む"] },
      { texts: ["次。"], choices: [] },
    ]);
    const io = new FakeIO([":set unknown_var 1", "1"]);

    const code = await runGame(engine, io);

    expect(code).toBe(0);
    expect(io.err.some((line) => line.includes("変数の設定に失敗"))).toBe(true);
    expect(engine.chosen).toEqual([0]);
  });

  it(":quit で終了コード 0 を返す", async () => {
    const engine = new FakeEngine([{ texts: ["開始。"], choices: ["進む"] }]);
    const io = new FakeIO([":quit"]);

    const code = await runGame(engine, io);

    expect(code).toBe(0);
    expect(engine.chosen).toEqual([]);
  });

  it("入力が EOF になると終了コード 0 を返す", async () => {
    const engine = new FakeEngine([{ texts: ["開始。"], choices: ["進む"] }]);
    const io = new FakeIO([null]);

    const code = await runGame(engine, io);

    expect(code).toBe(0);
  });
});
