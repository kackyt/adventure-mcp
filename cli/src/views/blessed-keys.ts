import type { Action, ViewModel } from "../controller/view-model.ts";

/** translateKey が必要とするキーイベントの最小形（blessed の IKeyEventArg が満たす）。 */
export interface KeyLike {
  name?: string;
  full?: string;
}

/**
 * キー入力を現在のモードに応じて {@link Action} に翻訳する純粋関数。
 * 該当する操作がなければ null を返す。
 *
 * @param vm 現在の ViewModel（モード判定に使用）
 * @param ch 入力文字（印字可能文字のとき）
 * @param key キーイベント（name / full）
 */
export function translateKey(vm: ViewModel, ch: string | undefined, key: KeyLike): Action | null {
  if (key.full === "C-c") {
    return { type: "quit" };
  }

  if (vm.command.active) {
    switch (key.name) {
      case "return":
      case "enter":
        return { type: "commandSubmit" };
      case "escape":
        return { type: "commandCancel" };
      case "backspace":
        return { type: "commandBackspace" };
    }
    // 制御文字を除く 1 文字を入力として受け取る（'q' 等もコマンド文字列の一部）
    if (ch && ch.length === 1 && ch >= " ") {
      return { type: "commandInput", char: ch };
    }
    return null;
  }

  if (vm.ended) {
    if (["q", "escape", "return", "enter"].includes(key.name ?? "")) {
      return { type: "quit" };
    }
    return null;
  }

  switch (key.name) {
    case "up":
      return { type: "moveUp" };
    case "down":
      return { type: "moveDown" };
    case "return":
    case "enter":
      return { type: "confirm" };
    case "escape":
    case "q":
      return { type: "quit" };
  }
  if (ch === ":") {
    return { type: "enterCommandMode" };
  }
  if (ch && /^[1-9]$/.test(ch)) {
    return { type: "selectIndex", index: Number(ch) - 1 };
  }
  return null;
}
