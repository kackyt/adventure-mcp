import { describe, expect, it } from "vitest";
import type { ViewModel } from "../controller/view-model.ts";
import { translateKey } from "./blessed-keys.ts";

function vm(overrides: Partial<ViewModel> = {}): ViewModel {
  return {
    mode: "choosing",
    status: { variables: {}, visible: true },
    location: null,
    scene: "",
    choices: [],
    command: { active: false, buffer: "" },
    input: { active: false, buffer: "" },
    message: null,
    ended: false,
    ...overrides,
  };
}

describe("translateKey", () => {
  it("Ctrl+C は常に quit", () => {
    expect(translateKey(vm(), undefined, { full: "C-c" })).toEqual({ type: "quit" });
    expect(
      translateKey(vm({ command: { active: true, buffer: "x" } }), undefined, { full: "C-c" }),
    ).toEqual({
      type: "quit",
    });
  });

  describe("choosing モード", () => {
    it("↑↓ は move、Enter は confirm", () => {
      expect(translateKey(vm(), undefined, { name: "up" })).toEqual({ type: "moveUp" });
      expect(translateKey(vm(), undefined, { name: "down" })).toEqual({ type: "moveDown" });
      expect(translateKey(vm(), undefined, { name: "return" })).toEqual({ type: "confirm" });
      expect(translateKey(vm(), undefined, { name: "enter" })).toEqual({ type: "confirm" });
    });

    it("q / Esc は quit", () => {
      expect(translateKey(vm(), "q", { name: "q" })).toEqual({ type: "quit" });
      expect(translateKey(vm(), undefined, { name: "escape" })).toEqual({ type: "quit" });
    });

    it("'C-g' は commandMode、数字は selectIndex（0 始まり）", () => {
      expect(translateKey(vm(), undefined, { full: "C-g" })).toEqual({ type: "enterCommandMode" });
      expect(translateKey(vm(), "1", { name: "1" })).toEqual({ type: "selectIndex", index: 0 });
      expect(translateKey(vm(), "3", { name: "3" })).toEqual({ type: "selectIndex", index: 2 });
    });

    it("該当しないキーは null", () => {
      expect(translateKey(vm(), "a", { name: "a" })).toBeNull();
      expect(translateKey(vm(), "0", { name: "0" })).toBeNull();
    });
  });

  describe("command モード", () => {
    const cmd = vm({ mode: "command", command: { active: true, buffer: "" } });

    it("Enter は submit、Esc は cancel、Backspace は backspace", () => {
      expect(translateKey(cmd, undefined, { name: "return" })).toEqual({ type: "commandSubmit" });
      expect(translateKey(cmd, undefined, { name: "escape" })).toEqual({ type: "commandCancel" });
      expect(translateKey(cmd, undefined, { name: "backspace" })).toEqual({
        type: "commandBackspace",
      });
    });

    it("印字可能文字は commandInput（'q' も文字として扱う）", () => {
      expect(translateKey(cmd, "q", { name: "q" })).toEqual({ type: "commandInput", char: "q" });
      expect(translateKey(cmd, ":", { name: ":" })).toEqual({ type: "commandInput", char: ":" });
      expect(translateKey(cmd, " ", { name: "space" })).toEqual({
        type: "commandInput",
        char: " ",
      });
    });
  });

  describe("input モード（自由入力待ち）", () => {
    const input = vm({ mode: "input", input: { active: true, buffer: "" } });

    it("Enter は送信、Backspace は削除、Esc はバッファ消去", () => {
      expect(translateKey(input, undefined, { name: "return" })).toEqual({ type: "inputSubmit" });
      expect(translateKey(input, undefined, { name: "backspace" })).toEqual({
        type: "inputBackspace",
      });
      expect(translateKey(input, undefined, { name: "escape" })).toEqual({ type: "inputClear" });
    });

    it("印字可能文字は inputChar（'q'・数字・':' も回答の一部）", () => {
      expect(translateKey(input, "q", { name: "q" })).toEqual({ type: "inputChar", char: "q" });
      expect(translateKey(input, "1", { name: "1" })).toEqual({ type: "inputChar", char: "1" });
      expect(translateKey(input, ":", { name: ":" })).toEqual({ type: "inputChar", char: ":" });
    });

    it("Ctrl+C は input モードでも quit", () => {
      expect(translateKey(input, undefined, { full: "C-c" })).toEqual({ type: "quit" });
    });
  });

  describe("ended モード", () => {
    const ended = vm({ mode: "ended", ended: true });
    it("q / Esc / Enter で quit、それ以外は null", () => {
      expect(translateKey(ended, "q", { name: "q" })).toEqual({ type: "quit" });
      expect(translateKey(ended, undefined, { name: "return" })).toEqual({ type: "quit" });
      expect(translateKey(ended, "a", { name: "a" })).toBeNull();
    });
  });
});
