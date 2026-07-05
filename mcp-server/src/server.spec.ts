import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  compileInkToJson,
  FsSaveStorage,
  FsScenarioStorage,
  SaveCodec,
  SessionManager,
} from "engine";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMcpServer } from "./server.ts";

// 本番シナリオは docs/06-reference/scenarios/ へ参照化されたため、MCP 配線（ツール登録・
// セッション寿命・エラーコード）は最小のインライン fixture をその場コンパイルして検証する。
// ＊アンチチート検証のため secret_flag（非公開）と public_status 自体が status に出ないこと。
const FIXTURE_ID = "mcp_fixture";
const FIXTURE_INK = `VAR public_status = "place"
VAR place = "テスト広場"
VAR secret_flag = false
VAR code = ""
-> square
=== square ===
テスト広場に立っている。
+ [石碑を調べる] -> inspect
+ [北へ向かう] -> north
+ [錠前に触れる] -> lock
=== inspect ===
石碑には何も彫られていない。
-> square
=== north ===
北へ進んだ。行き止まりだ。
+ [引き返す] -> square
=== lock ===
古い錠前がある。 # input: code
+ [番号を合わせる] -> lock_check
=== lock_check ===
{ code == "42":
    錠前が外れた。
    -> DONE
- else:
    番号が違う。
    -> square
}
`;

let assetsDir: string;

beforeAll(() => {
  assetsDir = mkdtempSync(join(tmpdir(), "mcp-scenario-"));
  writeFileSync(join(assetsDir, `${FIXTURE_ID}.json`), compileInkToJson(FIXTURE_INK), "utf-8");
});

/** インライン fixture を読む fs アダプタ＋in-memory transport で end-to-end の配線を検証する。 */
async function connectClient(): Promise<Client> {
  const tempSaveDir = "./save-data-test";
  const manager = new SessionManager(
    new FsScenarioStorage(assetsDir),
    new FsSaveStorage(tempSaveDir),
    new SaveCodec("test-secret"),
  );
  const server = createMcpServer(manager);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

function structured(result: CallToolResult): Record<string, unknown> {
  return result.structuredContent as Record<string, unknown>;
}

function errorPayload(result: CallToolResult): Record<string, unknown> {
  const first = result.content[0];
  if (first.type !== "text") throw new Error("expected text content");
  return JSON.parse(first.text);
}

describe("MCP server (in-memory transport)", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectClient();
  });

  afterAll(() => {
    rmSync("./save-data-test", { recursive: true, force: true });
    rmSync(assetsDir, { recursive: true, force: true });
  });

  it("11 ツールが登録・公開される", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "choose",
      "delete_save",
      "end_game",
      "get_history",
      "get_situation",
      "list_saves",
      "list_scenarios",
      "load_game",
      "save_game",
      "start_game",
      "submit_input",
    ]);
  });

  it("list_scenarios → start_game → choose → get_situation → get_history → end_game のハッピーパス", async () => {
    const list = (await client.callTool({
      name: "list_scenarios",
      arguments: {},
    })) as CallToolResult;
    expect(structured(list).scenarios).toContain(FIXTURE_ID);

    const started = (await client.callTool({
      name: "start_game",
      arguments: { scenarioId: FIXTURE_ID },
    })) as CallToolResult;
    const s = structured(started);
    const sessionId = s.sessionId as string;
    expect(sessionId).toMatch(/[0-9a-f-]{36}/);
    expect(Array.isArray(s.choices)).toBe(true);
    expect(s.awaitingInput).toBe(false);
    // アンチチート: 公開ステータスのみ。解法フラグ・正解変数・public_status 自体は出ない。
    expect(s.status).toHaveProperty("place");
    expect(s.status).not.toHaveProperty("secret_flag");
    expect(s.status).not.toHaveProperty("code");
    expect(s.status).not.toHaveProperty("public_status");

    const chosen = (await client.callTool({
      name: "choose",
      arguments: { sessionId, index: 0, expectedText: "石碑を調べる" },
    })) as CallToolResult;
    expect((structured(chosen).scene as string).length).toBeGreaterThan(0);

    const situation = (await client.callTool({
      name: "get_situation",
      arguments: { sessionId },
    })) as CallToolResult;
    expect((structured(situation).status as Record<string, unknown>).place).toBe("テスト広場");

    const history = (await client.callTool({
      name: "get_history",
      arguments: { sessionId },
    })) as CallToolResult;
    const turns = structured(history).turns as Array<{ choice: string | null }>;
    expect(turns[0].choice).not.toBeNull();
    expect(turns.at(-1)?.choice).toBeNull();

    const ended = (await client.callTool({
      name: "end_game",
      arguments: { sessionId },
    })) as CallToolResult;
    expect(structured(ended)).toEqual({ ok: true });

    // 破棄後は unknown_session（isError + 固定コード）
    const after = (await client.callTool({
      name: "get_situation",
      arguments: { sessionId },
    })) as CallToolResult;
    expect(after.isError).toBe(true);
    expect(errorPayload(after).code).toBe("unknown_session");
  });

  it("自由入力: 入力モード時のみ submit_input が通り、choose は拒否される (#13)", async () => {
    const started = (await client.callTool({
      name: "start_game",
      arguments: { scenarioId: FIXTURE_ID },
    })) as CallToolResult;
    const sessionId = structured(started).sessionId as string;

    // 入力モード外での submit_input はバリデーションで拒否（AI は正誤判断せず値を渡すだけ）
    const early = (await client.callTool({
      name: "submit_input",
      arguments: { sessionId, value: "0000" },
    })) as CallToolResult;
    expect(early.isError).toBe(true);
    expect(errorPayload(early).code).toBe("input_not_allowed");

    // 錠前に触れる → 入力モードへ（選択肢は秘匿される）
    const atLock = (await client.callTool({
      name: "choose",
      arguments: { sessionId, index: 2, expectedText: "錠前に触れる" },
    })) as CallToolResult;
    expect(structured(atLock).awaitingInput).toBe(true);
    expect(structured(atLock).choices).toEqual([]);

    // 入力モード中の choose は input_required
    const blocked = (await client.callTool({
      name: "choose",
      arguments: { sessionId, index: 0 },
    })) as CallToolResult;
    expect(blocked.isError).toBe(true);
    expect(errorPayload(blocked).code).toBe("input_required");

    // 誤入力では進めない（広場に戻る）
    const wrong = (await client.callTool({
      name: "submit_input",
      arguments: { sessionId, value: "99" },
    })) as CallToolResult;
    expect(structured(wrong).awaitingInput).toBe(false);
    expect(structured(wrong).ended).toBe(false);

    // 正しい入力でのみ進行してクリア到達
    await client.callTool({
      name: "choose",
      arguments: { sessionId, index: 2, expectedText: "錠前に触れる" },
    });
    const cleared = (await client.callTool({
      name: "submit_input",
      arguments: { sessionId, value: "42" },
    })) as CallToolResult;
    expect(structured(cleared).ended).toBe(true);
  });

  it("不明シナリオは unknown_scenario の isError", async () => {
    const res = (await client.callTool({
      name: "start_game",
      arguments: { scenarioId: "../../etc/passwd" },
    })) as CallToolResult;
    expect(res.isError).toBe(true);
    expect(errorPayload(res).code).toBe("unknown_scenario");
  });

  it("範囲外 index は choice_out_of_range（現在の選択肢同梱）", async () => {
    const started = (await client.callTool({
      name: "start_game",
      arguments: { scenarioId: FIXTURE_ID },
    })) as CallToolResult;
    const sessionId = structured(started).sessionId as string;

    const res = (await client.callTool({
      name: "choose",
      arguments: { sessionId, index: 99 },
    })) as CallToolResult;
    expect(res.isError).toBe(true);
    const payload = errorPayload(res);
    expect(payload.code).toBe("choice_out_of_range");
    expect(Array.isArray(payload.choices)).toBe(true);
  });
});
