import type { Choice } from "engine";
import { EngineError, GameSession } from "engine";
import { describe, expect, it } from "vitest";
import { GameController } from "./game-controller.ts";
import type { PlayableEngine } from "./view-model.ts";

/** FakeEngine を GameSession に包んで GameController を生成するヘルパ。 */
function controller(engine: PlayableEngine): GameController {
  return new GameController(new GameSession(engine));
}

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
  public readonly chosen: number[] = [];
  private cursor = 0;

  constructor(
    private readonly nodes: FakeNode[],
    variables: Record<string, unknown> = {},
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
    if (!(name in this.variables)) {
      throw new EngineError(`Failed to set variable: ${name}`);
    }
    this.variables[name] = value;
  }

  getVariables(): Record<string, unknown> {
    return { ...this.variables };
  }

  getPublicVariables(): Record<string, unknown> {
    return {};
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

describe("GameController", () => {
  it("初期化時に最初のシーンと選択肢を提示する", () => {
    const engine = new FakeEngine([
      { texts: ["暗い部屋にいる。", "扉と机がある。"], choices: ["扉を調べる", "待つ"] },
    ]);
    const vm = controller(engine).getViewModel();

    expect(vm.scene).toBe("暗い部屋にいる。\n扉と机がある。");
    expect(vm.mode).toBe("choosing");
    expect(vm.choices).toEqual([
      { label: "扉を調べる", selected: true },
      { label: "待つ", selected: false },
    ]);
  });

  it("全変数のスナップショットをステータスに載せる", () => {
    const engine = new FakeEngine([{ texts: ["開始。"], choices: ["進む"] }], {
      has_key: false,
      hp: 100,
    });
    const vm = controller(engine).getViewModel();
    expect(vm.status.variables).toEqual({ has_key: false, hp: 100 });
  });

  it("ステータスは既定で非表示、:vars でトグル、on/off で明示切替", () => {
    const c = controller(new FakeEngine([{ texts: ["S"], choices: ["go"] }], { hp: 1 }));
    expect(c.getViewModel().status.visible).toBe(false);

    c.apply({ type: "runCommand", raw: ":vars" });
    expect(c.getViewModel().status.visible).toBe(true);
    expect(c.getViewModel().message).toEqual({ kind: "info", text: "変数表示: ON" });

    c.apply({ type: "runCommand", raw: ":vars" });
    expect(c.getViewModel().status.visible).toBe(false);

    c.apply({ type: "runCommand", raw: ":vars on" });
    expect(c.getViewModel().status.visible).toBe(true);
    c.apply({ type: "runCommand", raw: ":vars on" }); // 冪等
    expect(c.getViewModel().status.visible).toBe(true);
    c.apply({ type: "runCommand", raw: ":vars off" });
    expect(c.getViewModel().status.visible).toBe(false);
  });

  it("moveDown/moveUp でハイライトが移動し範囲外には出ない", () => {
    const c = controller(new FakeEngine([{ texts: ["分岐。"], choices: ["A", "B"] }]));

    c.apply({ type: "moveUp" }); // すでに先頭、変化なし
    expect(c.getViewModel().choices[0].selected).toBe(true);

    c.apply({ type: "moveDown" });
    expect(c.getViewModel().choices[1].selected).toBe(true);

    c.apply({ type: "moveDown" }); // すでに末尾、変化なし
    expect(c.getViewModel().choices[1].selected).toBe(true);
  });

  it("confirm でハイライト中の選択肢を選び次シーンへ進む", () => {
    const engine = new FakeEngine([
      { texts: ["分岐。"], choices: ["A", "B"] },
      { texts: ["B を選んだ。"], choices: [] },
    ]);
    const c = controller(engine);

    c.apply({ type: "moveDown" });
    c.apply({ type: "confirm" });

    expect(engine.chosen).toEqual([1]);
    expect(c.getViewModel().scene).toBe("B を選んだ。");
  });

  it("selectIndex で番号直接選択し進む", () => {
    const engine = new FakeEngine([
      { texts: ["分岐。"], choices: ["A", "B"] },
      { texts: ["先へ。"], choices: [] },
    ]);
    const c = controller(engine);

    c.apply({ type: "selectIndex", index: 0 });
    expect(engine.chosen).toEqual([0]);
  });

  it("範囲外の selectIndex はエラーメッセージを出し進まない", () => {
    const c = controller(new FakeEngine([{ texts: ["分岐。"], choices: ["A"] }]));
    c.apply({ type: "selectIndex", index: 5 });

    const vm = c.getViewModel();
    expect(vm.message?.kind).toBe("error");
    expect(vm.message?.text).toContain("範囲外");
    expect(vm.mode).toBe("choosing");
  });

  it("終端に達すると ended になる", () => {
    const c = controller(new FakeEngine([{ texts: ["終わり。"], choices: [] }]));
    const vm = c.getViewModel();
    expect(vm.mode).toBe("ended");
    expect(vm.ended).toBe(true);
  });

  it("コマンドモードに入り文字入力・バックスペースがバッファに反映される", () => {
    const c = controller(new FakeEngine([{ texts: ["S"], choices: ["go"] }]));

    c.apply({ type: "enterCommandMode" });
    c.apply({ type: "commandInput", char: "a" });
    c.apply({ type: "commandInput", char: "b" });
    c.apply({ type: "commandBackspace" });

    const vm = c.getViewModel();
    expect(vm.mode).toBe("command");
    expect(vm.command).toEqual({ active: true, buffer: "a" });
  });

  it("commandCancel でコマンドモードを抜けバッファを捨てる", () => {
    const c = controller(new FakeEngine([{ texts: ["S"], choices: ["go"] }]));
    c.apply({ type: "enterCommandMode" });
    c.apply({ type: "commandInput", char: "x" });
    c.apply({ type: "commandCancel" });

    const vm = c.getViewModel();
    expect(vm.mode).toBe("choosing");
    expect(vm.command).toEqual({ active: false, buffer: "" });
  });

  it("commandSubmit で :get の値をメッセージに表示する", () => {
    const c = controller(new FakeEngine([{ texts: ["S"], choices: ["go"] }], { hp: 100 }));
    c.apply({ type: "enterCommandMode" });
    for (const char of ":get hp") c.apply({ type: "commandInput", char });
    c.apply({ type: "commandSubmit" });

    const vm = c.getViewModel();
    expect(vm.message).toEqual({ kind: "info", text: "hp = 100" });
    expect(vm.mode).toBe("choosing");
  });

  it("runCommand で :set すると変数が更新される", () => {
    const engine = new FakeEngine([{ texts: ["S"], choices: ["go"] }], { hp: 100 });
    const c = controller(engine);

    c.apply({ type: "runCommand", raw: ":set hp 30" });

    expect(c.getViewModel().status.variables.hp).toBe(30);
    expect(c.getViewModel().message).toEqual({ kind: "info", text: "hp = 30" });
  });

  it(":get で存在しない変数はエラーを出す", () => {
    const c = controller(new FakeEngine([{ texts: ["S"], choices: ["go"] }]));
    c.apply({ type: "runCommand", raw: ":get nope" });
    expect(c.getViewModel().message).toEqual({
      kind: "error",
      text: "変数が見つかりません: nope",
    });
  });

  it(":set で存在しない変数はエラーを出し継続する", () => {
    const c = controller(new FakeEngine([{ texts: ["S"], choices: ["go"] }]));
    c.apply({ type: "runCommand", raw: ":set nope 1" });

    const vm = c.getViewModel();
    expect(vm.message?.kind).toBe("error");
    expect(vm.message?.text).toContain("変数の設定に失敗");
    expect(vm.mode).toBe("choosing");
  });

  it("runCommand の数字は選択肢選択として扱われる", () => {
    const engine = new FakeEngine([
      { texts: ["分岐。"], choices: ["A", "B"] },
      { texts: ["先へ。"], choices: [] },
    ]);
    const c = controller(engine);
    c.apply({ type: "runCommand", raw: "2" });
    expect(engine.chosen).toEqual([1]);
  });

  it("quit / :quit で exitRequested が立つ", () => {
    const c1 = controller(new FakeEngine([{ texts: ["S"], choices: ["go"] }]));
    c1.apply({ type: "quit" });
    expect(c1.exitRequested).toBe(true);

    const c2 = controller(new FakeEngine([{ texts: ["S"], choices: ["go"] }]));
    c2.apply({ type: "runCommand", raw: ":quit" });
    expect(c2.exitRequested).toBe(true);
  });

  it("シーンが進むと直近メッセージはクリアされる", () => {
    const engine = new FakeEngine([
      { texts: ["S1"], choices: ["go"] },
      { texts: ["S2"], choices: [] },
    ]);
    const c = controller(engine);
    c.apply({ type: "runCommand", raw: ":get nope" }); // エラーメッセージを出す
    expect(c.getViewModel().message).not.toBeNull();

    c.apply({ type: "confirm" }); // 進行
    expect(c.getViewModel().message).toBeNull();
  });
});
