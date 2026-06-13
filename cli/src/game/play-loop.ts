import type { Choice } from "engine";
import { parseInput } from "../commands/input-parser.ts";
import { formatChoices, formatError, formatPassage, formatVariable } from "../views/formatter.ts";

/**
 * プレイループが利用するシナリオエンジンの操作。
 * `engine` の `ScenarioEngine` が構造的に満たす。ループを具象クラスから切り離し、
 * テスト時にフェイクを差し込めるようにするための抽象。
 */
export interface PlayableEngine {
  canContinue(): boolean;
  continue(): string;
  readonly currentChoices: Choice[];
  chooseChoiceIndex(index: number): void;
  getVariable(name: string): unknown;
  setVariable(name: string, value: unknown): void;
}

/**
 * プレイループが必要とする入出力の抽象。
 * 実体（readline / console）を差し替え可能にし、ループ本体をテスト可能にする。
 */
export interface GameIO {
  /** 1 行の入力を促す。入力ストリームが閉じられた場合は null を返す。 */
  prompt(question: string): Promise<string | null>;
  /** 1 行の標準出力を書き出す。 */
  write(line: string): void;
  /** 1 行のエラー出力を書き出す。 */
  writeError(line: string): void;
}

/** プレイループを終了させた要因。 */
type ChoiceResult = { kind: "chosen" } | { kind: "quit" } | { kind: "eof" };

/**
 * シナリオエンジンを対話的に進行させるメインループ。
 *
 * 本文を表示し、選択肢があればプレイヤーに入力を促す。番号入力で選択肢を選び、
 * `:get` / `:set` でデバッグ操作を行う。シナリオが終端に達するか、終了/EOF が
 * 入力されると終了コード 0 を返す。
 *
 * @returns プロセスの終了コード
 */
export async function runGame(engine: PlayableEngine, io: GameIO): Promise<number> {
  while (true) {
    // 続行可能な間は本文を読み進めて表示する
    while (engine.canContinue()) {
      const passage = formatPassage(engine.continue());
      if (passage.length > 0) {
        io.write(passage);
      }
    }

    const choices = engine.currentChoices;

    // 続行不可かつ選択肢なし = 終端
    if (choices.length === 0) {
      io.write("");
      io.write("--- 物語は終わりを迎えた ---");
      return 0;
    }

    io.write("");
    io.write(formatChoices(choices));

    const result = await promptForChoice(engine, choices, io);
    if (result.kind === "quit" || result.kind === "eof") {
      return 0;
    }
    // result.kind === "chosen" の場合はループ先頭に戻り、続きを進行する
  }
}

/**
 * 有効な選択肢が選ばれる（または終了/EOF）まで入力を受け付ける内部ループ。
 * デバッグコマンドや不正入力では選択肢を再提示せずに再入力を促す。
 */
async function promptForChoice(
  engine: PlayableEngine,
  choices: Choice[],
  io: GameIO,
): Promise<ChoiceResult> {
  while (true) {
    const raw = await io.prompt("> ");
    if (raw === null) {
      return { kind: "eof" };
    }

    const command = parseInput(raw);
    switch (command.kind) {
      case "empty":
        continue;

      case "quit":
        io.write("プレイを終了します。");
        return { kind: "quit" };

      case "invalid":
        io.writeError(formatError(command.reason));
        continue;

      case "getVar":
        handleGetVar(engine, command.name, io);
        continue;

      case "setVar":
        handleSetVar(engine, command.name, command.value, io);
        continue;

      case "choice": {
        if (command.index >= choices.length) {
          io.writeError(
            formatError(`選択肢の番号が範囲外です: ${command.index + 1}（1〜${choices.length}）`),
          );
          continue;
        }
        engine.chooseChoiceIndex(command.index);
        return { kind: "chosen" };
      }
    }
  }
}

function handleGetVar(engine: PlayableEngine, name: string, io: GameIO): void {
  try {
    const value = engine.getVariable(name);
    // Ink の VAR は非 null 初期値を持つため、null/undefined は未定義変数とみなす
    if (value === null || value === undefined) {
      io.writeError(formatError(`変数が見つかりません: ${name}`));
      return;
    }
    io.write(formatVariable(name, value));
  } catch (e) {
    io.writeError(formatError(withCause(`変数の取得に失敗しました: ${name}`, e)));
  }
}

function handleSetVar(
  engine: PlayableEngine,
  name: string,
  value: number | boolean | string,
  io: GameIO,
): void {
  try {
    engine.setVariable(name, value);
    io.write(formatVariable(name, value));
  } catch (e) {
    // 未宣言の変数への代入は InkJS が例外を投げるため、エラーとして提示し継続する
    io.writeError(formatError(withCause(`変数の設定に失敗しました: ${name}`, e)));
  }
}

/** 日本語の文脈メッセージを主とし、判明していれば原因の詳細を括弧で添える。 */
function withCause(message: string, e: unknown): string {
  const detail = e instanceof Error ? e.message : undefined;
  return detail ? `${message}（${detail}）` : message;
}
