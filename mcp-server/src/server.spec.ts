import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { FsSaveStorage, FsScenarioStorage, SaveCodec, SessionManager } from "engine";
import { beforeEach, describe, expect, it } from "vitest";
import { createMcpServer } from "./server.ts";

/** 実 assets を読む fs アダプタ＋in-memory transport で end-to-end の配線を検証する。 */
async function connectClient(): Promise<Client> {
  // テスト用の一時ディレクトリを作成
  const tempSaveDir = "./save-data-test";
  const manager = new SessionManager(
    new FsScenarioStorage(),
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

  it("10 ツールが登録・公開される", async () => {
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
    ]);
  });

  it("list_scenarios → start_game → choose → get_situation → get_history → end_game のハッピーパス", async () => {
    const list = (await client.callTool({
      name: "list_scenarios",
      arguments: {},
    })) as CallToolResult;
    expect(structured(list).scenarios).toContain("public_status_demo");

    const started = (await client.callTool({
      name: "start_game",
      arguments: { scenarioId: "public_status_demo" },
    })) as CallToolResult;
    const s = structured(started);
    const sessionId = s.sessionId as string;
    expect(sessionId).toMatch(/[0-9a-f-]{36}/);
    expect(Array.isArray(s.choices)).toBe(true);
    // アンチチート: 公開ステータスのみ。解法フラグ・public_status 自体は出ない。
    expect(s.status).toHaveProperty("player_hp");
    expect(s.status).not.toHaveProperty("has_master_key");
    expect(s.status).not.toHaveProperty("public_status");

    const chosen = (await client.callTool({
      name: "choose",
      arguments: { sessionId, index: 0, expectedText: "宝箱" },
    })) as CallToolResult;
    expect((structured(chosen).status as Record<string, unknown>).gold).toBe(10);

    const situation = (await client.callTool({
      name: "get_situation",
      arguments: { sessionId },
    })) as CallToolResult;
    expect((structured(situation).status as Record<string, unknown>).gold).toBe(10);

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
      arguments: { scenarioId: "public_status_demo" },
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
