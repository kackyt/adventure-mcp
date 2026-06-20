import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { SessionManager } from "engine";
import { SessionError } from "engine";
import { z } from "zod";

// ---------------------------------------------------------------------------
//  出力スキーマ（zod raw shape）。outputSchema を与えると SDK が structuredContent を
//  検証し、クライアントへ JSON Schema として公開する。
// ---------------------------------------------------------------------------
const choiceShape = z.object({ index: z.number().int(), text: z.string() });
const snapshotShape = {
  scene: z.string(),
  choices: z.array(choiceShape),
  status: z.record(z.unknown()),
  ended: z.boolean(),
};

/** 正常結果を structuredContent＋text(JSON) 併載のツール結果へ変換する。 */
function ok(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  };
}

/** SessionError を固定コード付きの isError ツール結果へ変換する（structuredContent は載せない）。 */
function fail(error: SessionError): CallToolResult {
  const payload: Record<string, unknown> = { code: error.code, message: error.message };
  if (error.choices) {
    payload.choices = error.choices;
  }
  return { content: [{ type: "text", text: JSON.stringify(payload) }], isError: true };
}

/**
 * 想定エラー(SessionError)は isError 結果へ、想定外失敗は MCP プロトコルエラー(McpError)へ。
 * これにより「想定/想定外」の二分がツール境界で機械的に分離される。
 */
function guard(run: () => unknown): CallToolResult {
  try {
    return ok(run());
  } catch (e) {
    if (e instanceof SessionError) {
      return fail(e);
    }
    throw new McpError(ErrorCode.InternalError, e instanceof Error ? e.message : String(e));
  }
}

/** SessionManager を 6 つの MCP ツールとして登録する（トランスポート非依存）。 */
export function registerTools(server: McpServer, manager: SessionManager): void {
  server.registerTool(
    "list_scenarios",
    {
      description: "プレイ可能なシナリオ id の一覧を返す。",
      inputSchema: {},
      outputSchema: { scenarios: z.array(z.string()) },
    },
    () => guard(() => ({ scenarios: manager.listScenarios() })),
  );

  server.registerTool(
    "start_game",
    {
      description:
        "シナリオを開始し、最初の選択肢提示または終端まで前進する。新しい sessionId を発行して返す。",
      inputSchema: { scenarioId: z.string() },
      outputSchema: { sessionId: z.string(), ...snapshotShape },
    },
    ({ scenarioId }) => guard(() => manager.startGame(scenarioId)),
  );

  server.registerTool(
    "choose",
    {
      description:
        "提示中の選択肢を index（提示順 0..n-1）で選び、次の状況まで前進する。expectedText を渡すと、選んだ選択肢ラベルと正規化のうえ照合し、不一致なら状態を進めず choice_mismatch を返す。",
      inputSchema: {
        sessionId: z.string(),
        index: z.number().int(),
        expectedText: z.string().optional(),
      },
      outputSchema: snapshotShape,
    },
    ({ sessionId, index, expectedText }) =>
      guard(() => manager.choose(sessionId, index, expectedText)),
  );

  server.registerTool(
    "get_situation",
    {
      description:
        "状態を進めずに、現在のシーン・選択可能な行動(choices)・公開ステータスを取得する。",
      inputSchema: { sessionId: z.string() },
      outputSchema: snapshotShape,
    },
    ({ sessionId }) => guard(() => manager.getSituation(sessionId)),
  );

  server.registerTool(
    "get_history",
    {
      description: "これまでの行動履歴（各ターンの表示済み本文と選んだラベル）を返す。",
      inputSchema: { sessionId: z.string() },
      outputSchema: {
        turns: z.array(
          z.object({ turn: z.number().int(), scene: z.string(), choice: z.string().nullable() }),
        ),
      },
    },
    ({ sessionId }) => guard(() => manager.getHistory(sessionId)),
  );

  server.registerTool(
    "end_game",
    {
      description:
        "セッションを終了して破棄する。以降の同 sessionId 操作は unknown_session になる。",
      inputSchema: { sessionId: z.string() },
      outputSchema: { ok: z.literal(true) },
    },
    ({ sessionId }) => guard(() => manager.endGame(sessionId)),
  );
}
