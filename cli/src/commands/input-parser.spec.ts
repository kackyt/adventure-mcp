import { describe, expect, it } from "vitest";
import { parseInkValue, parseInput } from "./input-parser.ts";

describe("parseInput", () => {
  it("空行は empty を返す", () => {
    expect(parseInput("")).toEqual({ kind: "empty" });
    expect(parseInput("   ")).toEqual({ kind: "empty" });
  });

  it("数字は 0 始まりの選択肢インデックスに変換する", () => {
    expect(parseInput("1")).toEqual({ kind: "choice", index: 0 });
    expect(parseInput("3")).toEqual({ kind: "choice", index: 2 });
  });

  it("前後の空白を無視する", () => {
    expect(parseInput("  2  ")).toEqual({ kind: "choice", index: 1 });
  });

  it("0 は範囲外として invalid を返す", () => {
    const result = parseInput("0");
    expect(result.kind).toBe("invalid");
  });

  it("数値でも選択肢でもない入力は invalid を返す", () => {
    expect(parseInput("look around").kind).toBe("invalid");
    expect(parseInput("1.5").kind).toBe("invalid");
  });

  it(":quit と :q は quit を返す", () => {
    expect(parseInput(":quit")).toEqual({ kind: "quit" });
    expect(parseInput(":q")).toEqual({ kind: "quit" });
    expect(parseInput(":QUIT")).toEqual({ kind: "quit" });
  });

  it(":get は変数取得コマンドを返す", () => {
    expect(parseInput(":get player_hp")).toEqual({ kind: "getVar", name: "player_hp" });
  });

  it(":get に変数名がなければ invalid を返す", () => {
    expect(parseInput(":get").kind).toBe("invalid");
  });

  it(":set は変数設定コマンドを返し、値を型変換する", () => {
    expect(parseInput(":set player_hp 90")).toEqual({
      kind: "setVar",
      name: "player_hp",
      value: 90,
    });
    expect(parseInput(":set has_key true")).toEqual({
      kind: "setVar",
      name: "has_key",
      value: true,
    });
  });

  it(":set は空白を含む文字列値を保持する", () => {
    expect(parseInput(':set note "hello world"')).toEqual({
      kind: "setVar",
      name: "note",
      value: "hello world",
    });
  });

  it(":set に値がなければ invalid を返す", () => {
    expect(parseInput(":set player_hp").kind).toBe("invalid");
  });

  it("未知の : コマンドは invalid を返す", () => {
    expect(parseInput(":foo").kind).toBe("invalid");
  });
});

describe("parseInkValue", () => {
  it("整数・小数を数値に変換する", () => {
    expect(parseInkValue("42")).toBe(42);
    expect(parseInkValue("-7")).toBe(-7);
    expect(parseInkValue("3.14")).toBe(3.14);
  });

  it("真偽値リテラルを boolean に変換する", () => {
    expect(parseInkValue("true")).toBe(true);
    expect(parseInkValue("false")).toBe(false);
  });

  it("クォート付き文字列はクォートを除去する", () => {
    expect(parseInkValue('"hello"')).toBe("hello");
  });

  it("それ以外は文字列のまま返す", () => {
    expect(parseInkValue("north")).toBe("north");
  });
});
