import { createHmac, timingSafeEqual } from "node:crypto";
import { SessionError } from "../../shared/errors/session-error.ts";
import type { SaveEnvelope } from "../dtos/game-dtos.ts";

const MAGIC_HEADER = "ADVSAVE.v1.b64";

/**
 * セーブデータの難読化（Base64化）と改ざん検知（HMAC-SHA256署名）を行うコーデック。
 * ※ HMAC鍵は任意の文字列（UTF-8）形式で渡される想定です。
 */
export class SaveCodec {
  constructor(private readonly secret: string) {}

  /**
   * エンベロープを Base64 文字列にし、署名を付与したテキストにエンコードする。
   */
  encode(envelope: SaveEnvelope): string {
    const json = JSON.stringify(envelope);
    const b64Body = Buffer.from(json, "utf-8").toString("base64");

    const hmac = createHmac("sha256", this.secret);
    const contentToSign = `${MAGIC_HEADER}\n${b64Body}`;
    hmac.update(contentToSign, "utf-8");
    const signature = hmac.digest("base64");

    return `${contentToSign}\n.sig=${signature}`;
  }

  /**
   * テキストを検証し、改ざんされていなければエンベロープとしてデコードする。
   * @throws {SessionError} 'save_tampered' - フォーマット不正、または署名不一致時
   */
  decode(text: string): SaveEnvelope {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length !== 3) {
      throw new SessionError("save_tampered", "セーブファイルの形式が不正です。");
    }

    const header = lines[0];
    const b64Body = lines[1];
    const sigLine = lines[2];

    if (header !== MAGIC_HEADER || !sigLine.startsWith(".sig=")) {
      throw new SessionError("save_tampered", "セーブファイルのヘッダまたは署名形式が不正です。");
    }

    const actualSignatureStr = sigLine.substring(5); // ".sig=" を除去

    // 期待される署名の計算
    const hmac = createHmac("sha256", this.secret);
    const contentToSign = `${header}\n${b64Body}`;
    hmac.update(contentToSign, "utf-8");
    const expectedSignature = hmac.digest(); // Buffer

    // actualSignature を Buffer 化して timingSafeEqual
    let actualSignature: Buffer;
    try {
      actualSignature = Buffer.from(actualSignatureStr, "base64");
    } catch {
      throw new SessionError("save_tampered", "セーブファイルの署名が不正な base64 です。");
    }

    // length mismatch の場合は timingSafeEqual がエラーになるため事前チェック
    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      throw new SessionError("save_tampered", "セーブデータが破損しているか、改ざんされています。");
    }

    try {
      const jsonStr = Buffer.from(b64Body, "base64").toString("utf-8");
      return JSON.parse(jsonStr) as SaveEnvelope;
    } catch {
      throw new SessionError("save_tampered", "セーブデータの復号に失敗しました。");
    }
  }
}
