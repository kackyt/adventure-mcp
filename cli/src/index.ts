#!/usr/bin/env node
import { readFileSync } from "node:fs";
import * as readline from "node:readline/promises";
import { EngineError, ScenarioEngine } from "engine";
import { type GameIO, runGame } from "./game/play-loop.ts";
import { formatError } from "./views/formatter.ts";

const USAGE = "使い方: adventure-cli <コンパイル済み Ink シナリオ (.json) へのパス>";

async function main(): Promise<number> {
  const scenarioPath = process.argv[2];
  if (!scenarioPath) {
    process.stderr.write(`${formatError("シナリオファイルのパスが指定されていません。")}\n`);
    process.stderr.write(`${USAGE}\n`);
    return 1;
  }

  let storyJson: string;
  try {
    const raw = readFileSync(scenarioPath, "utf-8");
    // inkjs-compiler の出力は UTF-8 BOM 付きのため、JSON.parse が失敗しないよう除去する
    storyJson = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    process.stderr.write(`${formatError(`シナリオファイルを読み込めません: ${detail}`)}\n`);
    return 1;
  }

  let engine: ScenarioEngine;
  try {
    engine = new ScenarioEngine(storyJson);
  } catch (e) {
    const detail = e instanceof EngineError ? e.message : String(e);
    process.stderr.write(`${formatError(`シナリオの読み込みに失敗しました: ${detail}`)}\n`);
    return 1;
  }

  const { io, close } = createReadlineIO();
  try {
    return await runGame(engine, io);
  } finally {
    close();
  }
}

function createReadlineIO(): { io: GameIO; close: () => void } {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  // パイプ入力では readline が全 line イベントと close を先に発火しうるため、
  // 受け取った行をキューに溜め、要求に応じて払い出す（行の取りこぼしを防ぐ）。
  const buffered: string[] = [];
  const waiters: ((line: string | null) => void)[] = [];
  let closed = false;

  rl.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) {
      waiter(line);
    } else {
      buffered.push(line);
    }
  });
  rl.on("close", () => {
    closed = true;
    // 入力ストリームが閉じられた（EOF / Ctrl+D）場合、待機中の要求は null で解決する
    for (const waiter of waiters.splice(0)) {
      waiter(null);
    }
  });

  const io: GameIO = {
    prompt(question) {
      process.stdout.write(question);
      const next = buffered.shift();
      if (next !== undefined) {
        return Promise.resolve(next);
      }
      if (closed) {
        return Promise.resolve(null);
      }
      return new Promise((resolve) => waiters.push(resolve));
    },
    write(line) {
      process.stdout.write(`${line}\n`);
    },
    writeError(line) {
      process.stderr.write(`${line}\n`);
    },
  };

  return { io, close: () => rl.close() };
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
