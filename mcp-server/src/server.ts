import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionManager } from "engine";
import { registerTools } from "./tools/index.ts";

/**
 * 6 ツールを登録した MCP サーバを生成するトランスポート非依存ファクトリ。
 * stdio でも将来の HTTP(Hono) でも、本関数で作ったサーバを各トランスポートへ接続するだけでよい。
 */
export function createMcpServer(manager: SessionManager): McpServer {
  const server = new McpServer({
    name: "adventure-mcp-server",
    version: "1.0.0",
  });
  registerTools(server, manager);
  return server;
}
