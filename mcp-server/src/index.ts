#!/usr/bin/env node
import { FsScenarioStorage, SessionManager } from "engine";
import { createMcpServer } from "./server.ts";
import { runStdio } from "./transports/stdio.ts";

async function main(): Promise<void> {
  const manager = new SessionManager(new FsScenarioStorage());
  const server = createMcpServer(manager);
  await runStdio(server);
  // stdio transport は接続後プロセスが生き続ける（クライアント切断で終了）。
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exitCode = 1;
});
