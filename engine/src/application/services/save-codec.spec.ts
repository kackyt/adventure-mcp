import { describe, expect, it } from "vitest";
import { SessionError } from "../../shared/errors/session-error.ts";
import type { SaveEnvelope } from "../dtos/game-dtos.ts";
import { SaveCodec } from "./save-codec.ts";

describe("SaveCodec", () => {
  const secret = "test-secret-key-12345";
  const codec = new SaveCodec(secret);

  const dummyEnvelope: SaveEnvelope = {
    saveId: "save-01",
    scenarioId: "test-scenario",
    savedAt: "2026-06-28T12:00:00Z",
    schemaVersion: 1,
    session: {
      history: [],
      currentScene: "Scene",
      choices: [],
      inkChoiceIndices: [],
      ended: false,
      turnCounter: 1,
      inkState: "{}",
    },
  };

  it("encode と decode のラウンドトリップでデータが復元される", () => {
    const encoded = codec.encode(dummyEnvelope);
    expect(typeof encoded).toBe("string");
    expect(encoded).toMatch(/^ADVSAVE\.v1\.b64\n[a-zA-Z0-9+/=]+\n\.sig=[a-zA-Z0-9+/=]+$/);

    const decoded = codec.decode(encoded);
    expect(decoded).toEqual(dummyEnvelope);
  });

  it("異なる secret でデコードしようとすると save_tampered エラーになる", () => {
    const encoded = codec.encode(dummyEnvelope);
    const otherCodec = new SaveCodec("different-secret");

    expect(() => otherCodec.decode(encoded)).toThrowError(SessionError);
    try {
      otherCodec.decode(encoded);
    } catch (e) {
      expect((e as SessionError).code).toBe("save_tampered");
    }
  });

  it("本文 Base64 を改変すると save_tampered エラーになる", () => {
    const encoded = codec.encode(dummyEnvelope);
    const lines = encoded.split("\n");
    // 本文の最後を1文字削る（改変）
    lines[1] = `${lines[1].substring(0, lines[1].length - 1)}x`;
    const tampered = lines.join("\n");

    expect(() => codec.decode(tampered)).toThrowError(SessionError);
  });

  it("署名を改変すると save_tampered エラーになる", () => {
    const encoded = codec.encode(dummyEnvelope);
    const lines = encoded.split("\n");
    lines[2] = `${lines[2].substring(0, lines[2].length - 1)}x`;
    const tampered = lines.join("\n");

    expect(() => codec.decode(tampered)).toThrowError(SessionError);
  });

  it("ヘッダを改変すると save_tampered エラーになる", () => {
    const encoded = codec.encode(dummyEnvelope);
    const lines = encoded.split("\n");
    lines[0] = "ADVSAVE.v2.b64";
    const tampered = lines.join("\n");

    expect(() => codec.decode(tampered)).toThrowError(SessionError);
  });

  it("行数が不正な場合は save_tampered エラーになる", () => {
    const encoded = codec.encode(dummyEnvelope);
    const tampered = `${encoded}\nextra line`;
    expect(() => codec.decode(tampered)).toThrowError(SessionError);
  });
});
