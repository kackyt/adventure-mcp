import type { SaveEnvelope } from "engine/src/browser.ts";
import { describe, expect, it } from "vitest";
import { decodeWebSave, encodeWebSave, WebSaveError } from "./web-save-codec.ts";

function sampleEnvelope(): SaveEnvelope {
  return {
    saveId: "autosave",
    scenarioId: "cave_escape",
    savedAt: "2026-07-09T00:00:00.000Z",
    schemaVersion: 1,
    session: {
      history: [{ turn: 1, scene: "洞窟の入り口。🕯️", choice: null }],
      currentScene: "洞窟の入り口。🕯️",
      choices: [{ index: 0, text: "中へ進む" }],
      inkChoiceIndices: [0],
      ended: false,
      turnCounter: 1,
      inkState: '{"flows":{}}',
      awaitingInputVar: null,
    },
  };
}

function expectWebSaveError(fn: () => unknown, code: WebSaveError["code"]) {
  let error: unknown;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(WebSaveError);
  expect((error as WebSaveError).code).toBe(code);
}

describe("web-save-codec", () => {
  it("エンコード → デコードで往復できる（日本語・絵文字を含む）", () => {
    const envelope = sampleEnvelope();
    const text = encodeWebSave(envelope);
    expect(text.startsWith("ADVSAVE.web.v1.")).toBe(true);
    expect(decodeWebSave(text)).toEqual(envelope);
  });

  it("前後の空白・改行が付いていてもデコードできる（コピペ耐性）", () => {
    const text = `\n  ${encodeWebSave(sampleEnvelope())}  \n`;
    expect(decodeWebSave(text).scenarioId).toBe("cave_escape");
  });

  it("マーカーの無い文字列は invalid_format", () => {
    expectWebSaveError(() => decodeWebSave("これはセーブデータではない"), "invalid_format");
  });

  it("engine の SaveCodec 形式（ADVSAVE.v1.b64）は invalid_format として拒否する", () => {
    expectWebSaveError(() => decodeWebSave("ADVSAVE.v1.b64\nAAAA\n.sig=xxx"), "invalid_format");
  });

  it("Base64 が壊れている場合は corrupted", () => {
    expectWebSaveError(() => decodeWebSave("ADVSAVE.web.v1.%%%%"), "corrupted");
  });

  it("Base64 は正しいが JSON でない場合は corrupted", () => {
    expectWebSaveError(() => decodeWebSave(`ADVSAVE.web.v1.${btoa("not json")}`), "corrupted");
  });

  it("JSON だが必須フィールドが欠けている場合は invalid_format", () => {
    const text = `ADVSAVE.web.v1.${btoa(JSON.stringify({ scenarioId: "x" }))}`;
    expectWebSaveError(() => decodeWebSave(text), "invalid_format");
  });
});
