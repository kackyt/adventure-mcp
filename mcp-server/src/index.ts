#!/usr/bin/env node
import * as path from "node:path";
import { FsSaveStorage, FsScenarioStorage, SaveCodec, SessionManager } from "engine";
import { createMcpServer } from "./server.ts";
import { runStdio } from "./transports/stdio.ts";

async function main(): Promise<void> {
  const saveDir = path.join(process.cwd(), "save-data");
  const saveStorage = new FsSaveStorage(saveDir);
  const secret = process.env.ADVENTURE_SAVE_SECRET || "adventure-mcp-default-secret-key-2026";
  const saveCodec = new SaveCodec(secret);

  const manager = new SessionManager(new FsScenarioStorage(), saveStorage, saveCodec);
  const server = createMcpServer(manager);
  await runStdio(server);
  // stdio transport は接続後プロセスが生き続ける（クライアント切断で終了）。
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exitCode = 1;
});
