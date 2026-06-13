# cli

コンパイル済み Ink シナリオ (JSON) を対話的にプレイするためのデバッグ用 CLI です。
`engine` パッケージの公開 API（`ScenarioEngine`）のみを利用し、`inkjs` には直接依存しません。

TTY で起動すると全画面 TUI（シーン本文 + 選択肢。`:vars` で全変数のステータスバーを表示）で
プレイでき、パイプ・リダイレクトなどの非 TTY 環境では自動的に行ベース表示にフォールバックします。
設計の詳細は [docs/02-design/CLI_TUI.md](../docs/02-design/CLI_TUI.md) を参照してください。

## 使い方

```bash
# cli ディレクトリ内から
pnpm start ../engine/assets/room_escape.json

# リポジトリルートから（--filter 実行時の cwd は cli/ になる点に注意）
pnpm --filter cli start ../engine/assets/room_escape.json

# 行ベース表示を明示的に使う
pnpm start --plain ../engine/assets/room_escape.json
```

引数にはコンパイル済みの Ink シナリオ（`pnpm build:ink` が生成する `.json`）へのパスを渡します。
パスは実行時のカレントディレクトリ（`--filter` 実行時は `cli/`）からの相対、または絶対パスで指定します。

## 操作（全画面 TUI）

| 入力 | 動作 |
| --- | --- |
| `↑` `↓` | 選択肢のハイライトを移動 |
| `Enter` | ハイライト中の選択肢を決定 |
| `1`〜`9` | 番号で選択肢を直接選択 |
| `:` | コマンドモードに入る |
| `q` / `Esc` / `Ctrl+C` | 終了（端末状態を復元して終了コード 0） |

コマンドモード（`:` 入力後）:

| 入力 | 動作 |
| --- | --- |
| `:get <変数名>` | Ink 変数の現在値をメッセージ行に表示する |
| `:set <変数名> <値>` | Ink 変数に値を設定する（整数・小数・`true`/`false`・文字列を解釈） |
| `:vars [on\|off]` | ステータスバーの変数表示を切り替える（引数なしでトグル） |
| `:quit` / `:q` | プレイを終了する |
| `Enter` | コマンドを実行 |
| `Esc` | コマンドモードを取り消す |

変数のステータスバーは既定で非表示です。`:vars`（または `:vars on`）で全 Ink 変数を
`name = value` 形式で表示するステータスバーを開けます。表示中は `:set` や進行で即座に更新され、
`:vars off` で閉じるとシーン本文の領域が広がります。

シナリオが終端に達すると「終わり」と表示され、`Enter` または `q` で終了します。

## 操作（行ベース / 非 TTY・`--plain`）

`入力>` プロンプトに対し、選択肢の番号、または `:get` / `:set` / `:vars` / `:quit` を 1 行で入力します
（ステータスバーは TUI 専用のため、`:vars` は状態メッセージの表示のみ）。

- 範囲外の番号や認識できない入力はエラーを表示して再入力を促します。
- シナリオが終端に達するか、`:quit` または EOF（Ctrl+D）で終了コード 0 で終了します。
- ファイルが存在しない・不正な場合はエラーを表示して終了コード 1 で終了します。

## アーキテクチャ

- `controller/` … ゲーム進行のヘッドレスロジック（`GameController`）。状態を `ViewModel` として導出し、
  入力を `Action` として受け取る。描画・端末 I/O に依存しないためユニットテスト可能。
- `views/` … `blessed-view`（neo-blessed の全画面 TUI）と `line-view`（行ベースフォールバック）。
  どちらも同一の `GameController` を駆動する薄いアダプタ。

## 開発

```bash
pnpm --filter cli typecheck
pnpm --filter cli test
```
