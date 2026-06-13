/**
 * プレイヤーの 1 行入力を解釈した結果を表す型。
 * 純粋なパース結果であり、副作用やゲーム状態への依存を持たない。
 */
export type Command =
  | { kind: "choice"; index: number }
  | { kind: "getVar"; name: string }
  | { kind: "setVar"; name: string; value: InkValue }
  | { kind: "toggleVars"; value: boolean | undefined } // ステータスの変数表示切替（未指定はトグル）
  | { kind: "quit" }
  | { kind: "empty" }
  | { kind: "invalid"; reason: string };

/** Ink 変数として扱える値の型。 */
export type InkValue = number | boolean | string;

/**
 * `:set` で渡された生の値文字列を Ink 変数の値に変換する。
 * 整数・小数・真偽値を優先的に解釈し、いずれにも該当しなければ文字列として扱う。
 * 文字列はダブルクォートで囲まれていれば取り除く。
 */
export function parseInkValue(raw: string): InkValue {
  if (raw === "true") return true;
  if (raw === "false") return false;

  // 整数・小数（先頭の +/- と指数表記なしのシンプルな数値のみ許容する）
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(raw)) {
    return Number(raw);
  }

  // 明示的にダブルクォートで囲まれた文字列はクォートを除去する
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1);
  }

  return raw;
}

/**
 * プレイヤーの 1 行入力を {@link Command} に変換する。
 *
 * - 数字のみ: 選択肢の選択（1 始まりの表示番号として解釈）
 * - `:get <name>`: 変数の取得
 * - `:set <name> <value>`: 変数の設定
 * - `:quit` / `:q`: 終了
 * - 空行: 何もしない
 * - それ以外: 不正な入力
 *
 * @param raw 標準入力から受け取った 1 行（改行を含まない想定）
 */
export function parseInput(raw: string): Command {
  const line = raw.trim();

  if (line.length === 0) {
    return { kind: "empty" };
  }

  if (line.startsWith(":")) {
    return parseDebugCommand(line);
  }

  // 選択肢の番号（表示は 1 始まり）
  if (/^\d+$/.test(line)) {
    const displayNumber = Number(line);
    if (displayNumber < 1) {
      return { kind: "invalid", reason: `選択肢の番号は 1 以上で指定してください: ${line}` };
    }
    return { kind: "choice", index: displayNumber - 1 };
  }

  return {
    kind: "invalid",
    reason: `認識できない入力です: ${line}（番号、または :get / :set / :quit を入力してください）`,
  };
}

function parseDebugCommand(line: string): Command {
  // 先頭の ":" を除いてトークンに分割する
  const body = line.slice(1);
  const [name, ...rest] = body.split(/\s+/);
  const command = name.toLowerCase();

  if (command === "quit" || command === "q") {
    return { kind: "quit" };
  }

  if (command === "get") {
    const varName = rest[0];
    if (!varName) {
      return { kind: "invalid", reason: ":get の使い方: :get <変数名>" };
    }
    return { kind: "getVar", name: varName };
  }

  if (command === "set") {
    const varName = rest[0];
    if (!varName || rest.length < 2) {
      return { kind: "invalid", reason: ":set の使い方: :set <変数名> <値>" };
    }
    // 値は空白を含みうるため、変数名以降をそのまま連結して解釈する
    const rawValue = rest.slice(1).join(" ");
    return { kind: "setVar", name: varName, value: parseInkValue(rawValue) };
  }

  if (command === "vars") {
    const arg = rest[0]?.toLowerCase();
    if (arg === "on") return { kind: "toggleVars", value: true };
    if (arg === "off") return { kind: "toggleVars", value: false };
    if (arg === undefined) return { kind: "toggleVars", value: undefined };
    return { kind: "invalid", reason: ":vars の使い方: :vars [on|off]" };
  }

  return {
    kind: "invalid",
    reason: `未知のコマンドです: :${command}（:get / :set / :vars / :quit が利用できます）`,
  };
}
