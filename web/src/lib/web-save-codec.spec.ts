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

  it("engine の SaveCodec 形式（ADVSAVE.v1.b64）の正しい形式をインポートできる", () => {
    const envelope = sampleEnvelope();
    const b64Body = Buffer.from(JSON.stringify(envelope), "utf-8").toString("base64");
    const cliSaveText = `ADVSAVE.v1.b64\n${b64Body}\n.sig=dGVzdF9zaWduYXR1cmU=`;
    expect(decodeWebSave(cliSaveText)).toEqual(envelope);
  });

  it("engine の SaveCodec 形式（ADVSAVE.v1.b64）だが署名ヘッダがない場合は invalid_format", () => {
    expectWebSaveError(() => decodeWebSave("ADVSAVE.v1.b64\nAAAA\n.not_sig=xxx"), "invalid_format");
  });

  it("engine の SaveCodec 形式（ADVSAVE.v1.b64）だが行数が不足している場合は invalid_format", () => {
    expectWebSaveError(() => decodeWebSave("ADVSAVE.v1.b64\nAAAA"), "invalid_format");
  });

  it("engine の SaveCodec 形式（ADVSAVE.v1.b64）だがBase64部分が壊れている場合は corrupted", () => {
    expectWebSaveError(() => decodeWebSave("ADVSAVE.v1.b64\n%%%%\n.sig=xxx"), "corrupted");
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
