# cli

コンパイル済み Ink シナリオ (JSON) を対話的にプレイするためのデバッグ用 CLI です。
`engine` パッケージの公開 API（`ScenarioEngine`）のみを利用し、`inkjs` には直接依存しません。

## 使い方

```bash
# cli ディレクトリ内から
pnpm start ../engine/assets/room_escape.json

# リポジトリルートから（--filter 実行時の cwd は cli/ になる点に注意）
pnpm --filter cli start ../engine/assets/room_escape.json
```

引数にはコンパイル済みの Ink シナリオ（`pnpm build:ink` が生成する `.json`）へのパスを渡します。
パスは実行時のカレントディレクトリ（`--filter` 実行時は `cli/`）からの相対、または絶対パスで指定します。

## 操作

| 入力 | 動作 |
| --- | --- |
| `<番号>` | 表示された選択肢を 1 始まりの番号で選ぶ |
| `:get <変数名>` | Ink 変数の現在値を表示する |
| `:set <変数名> <値>` | Ink 変数に値を設定する（整数・小数・`true`/`false`・文字列を解釈） |
| `:quit` / `:q` | プレイを終了する |

- 範囲外の番号や認識できない入力はエラーを表示して再入力を促します。
- シナリオが終端に達するか、`:quit` または EOF（Ctrl+D）で終了コード 0 で終了します。
- ファイルが存在しない・不正な場合はエラーを表示して終了コード 1 で終了します。

## 開発

```bash
pnpm --filter cli typecheck
pnpm --filter cli test
```
