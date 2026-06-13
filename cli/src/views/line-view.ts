import * as readline from "node:readline/promises";
import type { GameController } from "../controller/game-controller.ts";
import { formatChoices, formatError, formatPassage } from "./formatter.ts";
import type { GameView } from "./game-view.ts";

/**
 * line View が必要とする入出力の抽象。
 * 実体（readline）を差し替え可能にし、ループ本体をテスト可能にする。
 */
export interface LineIO {
  /** 1 行の入力を促す。入力ストリームが閉じられた場合は null を返す。 */
  prompt(question: string): Promise<string | null>;
  /** 1 行の標準出力を書き出す。 */
  write(line: string): void;
  /** 1 行のエラー出力を書き出す。 */
  writeError(line: string): void;
  /** 後始末（任意）。 */
  close(): void;
}

/**
 * 非TTY（パイプ / リダイレクト / `--plain`）向けの行ベース View。
 * 全画面 TUI と同じコントローラを駆動するが、表示は行の追記、入力は 1 行ごと。
 */
export class LineView implements GameView {
  private lastScene: string | null = null;
  private lastMessage: unknown = undefined;

  constructor(private readonly io: LineIO) {}

  async run(controller: GameController): Promise<number> {
    while (true) {
      const vm = controller.getViewModel();

      if (vm.scene !== this.lastScene) {
        this.io.write(formatPassage(vm.scene));
        this.lastScene = vm.scene;
      }

      if (vm.message && vm.message !== this.lastMessage) {
        if (vm.message.kind === "error") {
          this.io.writeError(formatError(vm.message.text));
        } else {
          this.io.write(vm.message.text);
        }
      }
      this.lastMessage = vm.message;

      if (vm.ended) {
        this.io.write("");
        this.io.write("--- 物語は終わりを迎えた ---");
        return 0;
      }

      this.io.write("");
      this.io.write(formatChoices(vm.choices.map((choice) => choice.label)));

      const raw = await this.io.prompt("入力> ");
      if (raw === null) {
        return 0;
      }

      controller.apply({ type: "runCommand", raw });
      if (controller.exitRequested) {
        return 0;
      }
    }
  }

  destroy(): void {
    this.io.close();
  }
}

/**
 * 標準入出力に接続した {@link LineIO} を生成する。
 *
 * パイプ入力では readline が全 line イベントと close を先に発火しうるため、
 * 受け取った行をキューに溜め、要求に応じて払い出す（行の取りこぼしを防ぐ）。
 */
export function createReadlineIO(): LineIO {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

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
    for (const waiter of waiters.splice(0)) {
      waiter(null);
    }
  });

  return {
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
    close() {
      rl.close();
    },
  };
}

/** 標準入出力に接続した line View を生成する。 */
export function createLineView(): LineView {
  return new LineView(createReadlineIO());
}
