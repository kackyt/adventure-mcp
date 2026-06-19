import type { Choice, GameSession } from "engine";
import { parseInput } from "../commands/input-parser.ts";
import type { Action, ViewMessage, ViewModel } from "./view-model.ts";

/**
 * ゲーム進行のヘッドレスコントローラ。
 *
 * 進行・選択・履歴は engine の {@link GameSession}（CLI と mcp-server で共用の前進
 * プリミティブ）に委譲し、本クラスは選択ハイライトやコマンドモードといった CLI 固有の
 * UI 状態のみを持つ。生変数の参照・改変は {@link GameSession.debug}（デバッグ専用経路）
 * を通す。描画や端末 I/O は持たないため、View 非依存のユニットテストで検証できる。
 */
export class GameController {
  private currentScene = "";
  private choices: Choice[] = [];
  private mode: "choosing" | "command" | "ended" = "choosing";
  private selectedIndex = 0;
  private commandBuffer = "";
  private message: ViewMessage | null = null;
  private statusVisible = false;
  private exited = false;

  constructor(private readonly session: GameSession) {
    // GameSession はコンストラクタで最初の状況まで前進済み。それを取り込む。
    this.applySnapshot(this.session.getSituation());
  }

  /** quit が要求されたか。driver はこれを見て後始末し終了する。 */
  get exitRequested(): boolean {
    return this.exited;
  }

  /** 入力意図を適用して状態を遷移させる。 */
  apply(action: Action): void {
    switch (action.type) {
      case "moveUp":
        this.move(-1);
        break;
      case "moveDown":
        this.move(1);
        break;
      case "confirm":
        this.confirmSelection();
        break;
      case "selectIndex":
        this.selectIndex(action.index);
        break;
      case "enterCommandMode":
        this.enterCommandMode();
        break;
      case "commandInput":
        if (this.mode === "command") this.commandBuffer += action.char;
        break;
      case "commandBackspace":
        if (this.mode === "command") this.commandBuffer = this.commandBuffer.slice(0, -1);
        break;
      case "commandSubmit":
        if (this.mode === "command") {
          const raw = this.commandBuffer;
          this.exitCommandMode();
          this.runCommand(raw);
        }
        break;
      case "commandCancel":
        this.exitCommandMode();
        break;
      case "runCommand":
        this.runCommand(action.raw);
        break;
      case "quit":
        this.exited = true;
        break;
    }
  }

  /** 描画用のスナップショットを返す。 */
  getViewModel(): ViewModel {
    return {
      mode: this.mode,
      // ステータス表示は CLI のデバッグ機能なので生変数全体を見せる（mcp の公開ステータスとは別）
      status: { variables: this.session.debug.getVariables(), visible: this.statusVisible },
      scene: this.currentScene,
      choices: this.choices.map((choice, i) => ({
        label: choice.text,
        selected: i === this.selectedIndex,
      })),
      command: { active: this.mode === "command", buffer: this.commandBuffer },
      message: this.message,
      ended: this.mode === "ended",
    };
  }

  /** GameSession のスナップショットから表示状態を確定する。 */
  private applySnapshot(snapshot: ReturnType<GameSession["getSituation"]>): void {
    this.currentScene = snapshot.scene;
    this.choices = snapshot.choices;
    this.selectedIndex = 0;
    this.message = null;
    this.mode = snapshot.ended ? "ended" : "choosing";
  }

  private move(delta: number): void {
    if (this.mode !== "choosing" || this.choices.length === 0) return;
    const next = this.selectedIndex + delta;
    if (next < 0 || next >= this.choices.length) return;
    this.selectedIndex = next;
  }

  private confirmSelection(): void {
    if (this.mode !== "choosing" || this.choices.length === 0) return;
    this.applySnapshot(this.session.choose(this.choices[this.selectedIndex].index));
  }

  private selectIndex(index: number): void {
    if (this.mode !== "choosing") return;
    if (index < 0 || index >= this.choices.length) {
      this.message = {
        kind: "error",
        text: `選択肢の番号が範囲外です: ${index + 1}（1〜${this.choices.length}）`,
      };
      return;
    }
    this.selectedIndex = index;
    this.confirmSelection();
  }

  private enterCommandMode(): void {
    if (this.mode !== "choosing") return;
    this.mode = "command";
    this.commandBuffer = "";
  }

  private exitCommandMode(): void {
    if (this.mode === "command") {
      this.mode = "choosing";
    }
    this.commandBuffer = "";
  }

  private runCommand(raw: string): void {
    const command = parseInput(raw);
    switch (command.kind) {
      case "empty":
        break;
      case "quit":
        this.exited = true;
        break;
      case "invalid":
        this.message = { kind: "error", text: command.reason };
        break;
      case "getVar":
        this.handleGetVar(command.name);
        break;
      case "setVar":
        this.handleSetVar(command.name, command.value);
        break;
      case "toggleVars":
        this.statusVisible = command.value ?? !this.statusVisible;
        this.message = {
          kind: "info",
          text: `変数表示: ${this.statusVisible ? "ON" : "OFF"}`,
        };
        break;
      case "choice":
        this.selectIndex(command.index);
        break;
    }
  }

  private handleGetVar(name: string): void {
    try {
      const value = this.session.debug.getVariable(name);
      // Ink の VAR は非 null 初期値を持つため、null/undefined は未定義変数とみなす
      if (value === null || value === undefined) {
        this.message = { kind: "error", text: `変数が見つかりません: ${name}` };
        return;
      }
      this.message = { kind: "info", text: formatVariable(name, value) };
    } catch (e) {
      this.message = { kind: "error", text: withCause(`変数の取得に失敗しました: ${name}`, e) };
    }
  }

  private handleSetVar(name: string, value: number | boolean | string): void {
    try {
      this.session.debug.setVariable(name, value);
      this.message = { kind: "info", text: formatVariable(name, value) };
    } catch (e) {
      // 未宣言の変数への代入は InkJS が例外を投げるため、エラーとして提示し継続する
      this.message = { kind: "error", text: withCause(`変数の設定に失敗しました: ${name}`, e) };
    }
  }
}

/** 変数を `name = value` 形式に整形する（文字列はクォート付き）。 */
export function formatVariable(name: string, value: unknown): string {
  const formatted = typeof value === "string" ? `"${value}"` : String(value);
  return `${name} = ${formatted}`;
}

/** 日本語の文脈メッセージを主とし、判明していれば原因の詳細を括弧で添える。 */
function withCause(message: string, e: unknown): string {
  const detail = e instanceof Error ? e.message : undefined;
  return detail ? `${message}（${detail}）` : message;
}
