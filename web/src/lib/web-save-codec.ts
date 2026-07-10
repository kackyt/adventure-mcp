import type { SaveEnvelope } from "engine/src/browser.ts";

/**
 * Web 版セーブ文字列の先頭マーカー。engine の SaveCodec（HMAC 署名付き）とは独立した
 * フォーマットであることを識別できるようにする。ブラウザ配布物に秘密鍵は埋め込めず
 * 署名に改ざん耐性が生まれないため、Web 版は難読化（Base64）のみとする。
 */
const MAGIC_HEADER = "ADVSAVE.web.v1.";

export type WebSaveErrorCode = "invalid_format" | "corrupted";

/** セーブ文字列の解釈失敗。フロントエンドはこの型を捕捉して利用者向けの文言を出す。 */
export class WebSaveError extends Error {
  constructor(
    public readonly code: WebSaveErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WebSaveError";
    Object.setPrototypeOf(this, WebSaveError.prototype);
  }
}

/** UTF-8 文字列を Base64 にする（btoa は Latin-1 前提のためバイト列経由で変換する）。 */
function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Base64 を UTF-8 文字列に戻す。 */
function decodeBase64Utf8(base64: string): string {
  // コピペで紛れ込む空白・改行を除去する（atob は空白混入でエラーになるため）
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** unknown な JSON 値が SaveEnvelope の形をしているかを検証する。 */
function isSaveEnvelope(value: unknown): value is SaveEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.scenarioId !== "string" || record.scenarioId.length === 0) return false;
  if (typeof record.schemaVersion !== "number") return false;
  if (typeof record.session !== "object" || record.session === null) return false;
  const session = record.session as Record<string, unknown>;
  return typeof session.inkState === "string" && Array.isArray(session.history);
}

/** セーブエンベロープを持ち運び可能な 1 行のセーブ文字列にエンコードする。 */
export function encodeWebSave(envelope: SaveEnvelope): string {
  return MAGIC_HEADER + encodeBase64Utf8(JSON.stringify(envelope));
}

/**
 * セーブ文字列を検証してエンベロープへデコードする。
 * @throws {WebSaveError} invalid_format（マーカー不一致・スキーマ不一致）/ corrupted（破損）
 */
export function decodeWebSave(text: string): SaveEnvelope {
  const trimmed = text.trim();
  let jsonStr: string;

  if (trimmed.startsWith(MAGIC_HEADER)) {
    // Web版フォーマット
    try {
      jsonStr = decodeBase64Utf8(trimmed.slice(MAGIC_HEADER.length));
    } catch {
      throw new WebSaveError("corrupted", "セーブデータが壊れています（復号に失敗しました）。");
    }
  } else {
    // CLI/MCP版フォーマット (ADVSAVE.v1.b64 \n Base64 \n .sig=signature)
    const lines = trimmed.split(/\r?\n/);
    if (lines.length === 3 && lines[0] === "ADVSAVE.v1.b64" && lines[2].startsWith(".sig=")) {
      try {
        jsonStr = decodeBase64Utf8(lines[1]);
      } catch {
        throw new WebSaveError("corrupted", "セーブデータが壊れています（復号に失敗しました）。");
      }
    } else {
      throw new WebSaveError(
        "invalid_format",
        "セーブデータの形式が違います。エクスポートした文字列全体を貼り付けてください。",
      );
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new WebSaveError("corrupted", "セーブデータが壊れています（JSON を解釈できません）。");
  }

  if (!isSaveEnvelope(parsed)) {
    throw new WebSaveError("invalid_format", "セーブデータに必要な情報が含まれていません。");
  }
  return parsed;
}
