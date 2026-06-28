import type { Choice } from "../../domain/services/scenario-engine.ts";

/**
 * 想定内のセッション操作エラーを表す固定コード集合。
 * これらは「AI に返してよい」業務エラーであり、MCP 層では `isError: true` の
 * ツール結果へ変換される。ここに無い想定外の失敗は {@link import("./engine-error.ts").EngineError}
 * 等としてそのまま伝播し、MCP プロトコルエラーになる。
 */
export type SessionErrorCode =
  | "unknown_session"
  | "unknown_scenario"
  | "choice_out_of_range"
  | "choice_mismatch"
  | "game_already_ended"
  | "unknown_save"
  | "save_tampered";

/**
 * セッション操作の想定内エラー。`code` で種別を、`choices` で（範囲外・不一致時の）
 * 現在の選択肢を運ぶ。mcp-server はこれを `catch` してエラー契約へ変換する。
 */
export class SessionError extends Error {
  constructor(
    public readonly code: SessionErrorCode,
    message: string,
    /** choice_out_of_range / choice_mismatch のとき、再提示用の現在の選択肢。 */
    public readonly choices?: Choice[],
  ) {
    super(message);
    this.name = "SessionError";
    // TypeScriptで組み込みクラスを継承する場合のおまじない
    Object.setPrototypeOf(this, SessionError.prototype);
  }
}
