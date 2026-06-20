#!/usr/bin/env node
import { EngineError, GameSession, readStoryJsonFromPath, ScenarioEngine } from "engine";
import { GameController } from "./controller/game-controller.ts";
import { BlessedView } from "./views/blessed-view.ts";
import { formatError } from "./views/formatter.ts";
import type { IGameView } from "./views/game-view.interface.ts";
import { createLineView } from "./views/line-view.ts";

const USAGE = "使い方: adventure-cli [--plain] <コンパイル済み Ink シナリオ (.json) へのパス>";

interface Args {
  plain: boolean;
  scenarioPath: string | undefined;
}

function parseArgs(argv: string[]): Args {
  let plain = false;
  let scenarioPath: string | undefined;
  for (const arg of argv) {
    if (arg === "--plain") {
      plain = true;
    } else if (scenarioPath === undefined) {
      scenarioPath = arg;
    }
  }
  return { plain, scenarioPath };
}

async function main(): Promise<number> {
  const { plain, scenarioPath } = parseArgs(process.argv.slice(2));
  if (!scenarioPath) {
    process.stderr.write(`${formatError("シナリオファイルのパスが指定されていません。")}\n`);
    process.stderr.write(`${USAGE}\n`);
    return 1;
  }

  let storyJson: string;
  try {
    // BOM 除去を含むシナリオ JSON の読み込みは engine 側ローダに集約されている
    storyJson = readStoryJsonFromPath(scenarioPath);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    process.stderr.write(`${formatError(`シナリオファイルを読み込めません: ${detail}`)}\n`);
    return 1;
  }

  let session: GameSession;
  try {
    session = new GameSession(new ScenarioEngine(storyJson));
  } catch (e) {
    const detail = e instanceof EngineError ? e.message : String(e);
    process.stderr.write(`${formatError(`シナリオの読み込みに失敗しました: ${detail}`)}\n`);
    return 1;
  }

  const controller = new GameController(session);
  const useTui = !plain && Boolean(process.stdout.isTTY) && Boolean(process.stdin.isTTY);
  const view: IGameView = useTui ? new BlessedView() : createLineView();

  // どの経路で抜けても端末を必ず復元する
  const cleanup = () => view.destroy();
  process.once("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
  process.once("uncaughtException", (e) => {
    cleanup();
    process.stderr.write(`${formatError(`予期しないエラーが発生しました: ${e.message}`)}\n`);
    process.exit(1);
  });

  try {
    return await view.run(controller);
  } finally {
    cleanup();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e) => {
    const detail = e instanceof Error ? e.message : String(e);
    process.stderr.write(`${formatError(`予期しないエラーが発生しました: ${detail}`)}\n`);
    process.exitCode = 1;
  });
