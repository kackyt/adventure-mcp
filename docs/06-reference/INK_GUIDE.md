---
title: "INK_GUIDE"
version: "1.0.0"
status: "draft"
owner: "kacky"
created: "2026-06-12"
updated: "2026-06-12"
---

# INK_GUIDE.md - Ink シナリオ作成・運用ガイド

本ドキュメントは、adventure-mcp プロジェクトにおける Ink シナリオファイルの書き方、コンパイル手順、およびエンジン（InkJS）と連携するための前提事項を定義します。シナリオ作成者は本ガイドに従って実装・テストを行ってください。

## 1. 前提知識

- シナリオは [Ink (inkle)](https://www.inklestudios.com/ink/) 言語で記述します。
- 実行時は [inkjs](https://github.com/y-lohse/inkjs) がコンパイル済み JSON を解釈し、`engine` パッケージの `ScenarioEngine`（[scenario-engine.ts](../../engine/src/domain/services/scenario-engine.ts)）がそれをラップします。
- アーキテクチャ全体像は [ARCHITECTURE.md](../02-design/ARCHITECTURE.md) を参照してください。

## 2. ファイル配置とディレクトリ構成

| 対象 | 配置場所 | 備考 |
| --- | --- | --- |
| シナリオソース (`.ink`) | `engine/assets/` | 1 シナリオ = 1 ファイル。サブディレクトリも再帰的にコンパイル対象になる |
| コンパイル済み JSON (`.json`) | `engine/assets/`（`.ink` と同名） | `pnpm build:ink` が自動生成する。**手動編集禁止** |

- ファイル名は **snake_case** とします（例: `room_escape.ink`）。
- 生成された `.json` は Git にコミットします。`.ink` を変更したら必ず再コンパイルし、`.ink` と `.json` を同じコミットに含めてください。

## 3. コンパイル手順（ローカル環境）

### 3.1 セットアップ

```bash
pnpm install
```

コンパイラは `inkjs` パッケージ付属の `inkjs-compiler` を使用するため、`inklecate` 本体の個別インストールは不要です。

### 3.2 コンパイル

プロジェクトルートで以下を実行します。

```bash
pnpm build:ink
```

（`engine/` ディレクトリ内で `pnpm run build:ink` を実行しても同じです。）

このコマンドは [build-ink.ts](../../engine/scripts/build-ink.ts) を起動し、次の処理を行います。

1. `engine/assets/` 配下の `.ink` ファイルを再帰的に検索する
2. 各ファイルを `inkjs-compiler` でコンパイルし、同名の `.json` を生成する
3. 文法エラーや無効な参照（存在しないノットへのダイバート等）があれば標準出力にエラーを表示し、**終了コード 1 で失敗する**

### 3.3 エラーが出た場合

- エラーメッセージに行番号と原因が表示されるので、該当の `.ink` を修正して再実行してください。
- 典型的なエラー例:
  - 存在しないノット名へのダイバート（タイポ）
  - `VAR` 宣言していない変数への代入
  - ノット末尾の遷移漏れ（"ran out of content" 系の警告）

### 3.4 動作確認

コンパイル成功後、エンジンのユニットテストで基本動作を確認できます。

```bash
pnpm --filter engine test
```

新しいシナリオを追加した場合は、[scenario-engine.spec.ts](../../engine/src/domain/services/scenario-engine.spec.ts) を参考に、主要ルート（クリアまでの最短経路など）を通すテストを追加することを推奨します。

## 4. エンジン連携の前提事項（必須構成）

`ScenarioEngine` と正しく連携するため、すべての `.ink` ファイルは以下の構成ルールを満たす必要があります。

### 4.1 必須構成

1. **グローバル変数はファイル先頭で `VAR` 宣言する**

   ```ink
   VAR has_key = false

   -> locked_room
   ```

2. **冒頭でエントリーポイントとなるノットへダイバートする**（上記 `-> locked_room`）。
3. **すべてのノットは「選択肢の提示」「他ノットへの遷移 (`->`)」「終了 (`-> DONE`)」のいずれかで必ず終わる**こと。プレイヤーが選択肢を失って進行不能になるデッドエンドを作らないでください。
4. **シナリオの終了は `-> DONE` で明示する**こと。エンジンは `canContinue` と選択肢の有無で進行状態を判定します。
5. **公開ステータスは予約変数 `public_status` で宣言する**こと（詳細は §4.5）。AI に見せてよいステータス変数名をカンマ区切りで列挙します。公開するものが無い場合も `VAR public_status = ""` を宣言します。

### 4.2 変数命名規則

| 種別 | 規則 | 例 |
| --- | --- | --- |
| 真偽値フラグ（所持・状態） | `has_` / `is_` + snake_case | `has_key`, `is_door_open` |
| 数値（カウンタ・ステータス） | snake_case 名詞 | `player_hp`, `visit_count` |
| 文字列 | snake_case 名詞 | `player_name` |
| ノット / ステッチ名 | snake_case（場面・場所を表す名詞） | `locked_room`, `escape` |
| 一時変数（`~ temp`） | snake_case | `damage` |
| 予約変数（公開ステータス宣言） | `public_status`（固定名・カンマ区切りの公開変数名リスト） | `VAR public_status = "player_hp,location"` |

- 変数名・ノット名はすべて **snake_case の英小文字** とします（Ink の識別子に日本語は使用しない）。
- エンジンの `getVariable(name)` / `setVariable(name, value)` は宣言済みのグローバル変数名をそのまま参照します。**変数名の変更はエンジン側・テスト側の参照に影響する**ため、リネーム時は横断的に確認してください。

### 4.3 状態管理の原則（MCP との責務分担）

[MASTER.md](../../MASTER.md) の開発ルールに基づき、以下を厳守します。

- **状態遷移はすべて Ink 内で完結させる**: アイテム取得・フラグ更新・ステータス増減は `~ 変数 = 値` として `.ink` 内に記述します。AI（ゲームマスター役）に状態の更新を委ねてはいけません。
- **分岐は必ず Ink の選択肢（Choices）として表現する**: AI はエンジンが提示した選択肢（`currentChoices`）の中からプレイヤーの意思に基づき `chooseChoiceIndex` を呼ぶだけです。選択肢に存在しないアクションは実行できません。
- **AI に秘匿情報を渡さない前提で書く**: ノットの本文には「現在プレイヤーに見えている状況」のみを描写し、未解明のフラグやネタバレ（解法）を地の文に含めないでください。
- **AI に見せてよいステータスは `public_status` で明示的に公開する**: HP・所持金・現在地など、プレイヤーに見えていてよい指標だけを予約変数 `public_status` に列挙します。解法フラグは載せません（§4.5）。

### 4.4 選択肢の書き方

- 一度しか実行できないアクション（宝箱を開ける等）は `*`、何度でも実行できるアクション（調べる等）は `+` を使用します。
- 選択肢のラベルは `[行動]` 形式で、プレイヤーが取り得る行動として記述します。
- 状況変化で選択肢がなくなる可能性がある場合は、条件なしのフォールバック選択肢（`+ -> fallback_knot` のように遷移先を指定）を用意します。

```ink
=== locked_room ===
あなたは鍵のかかった部屋に閉じ込められている。
部屋には頑丈な木の扉と、古びた机がある。

+ [机を調べる]
    机の引き出しを開けると、古びた鍵を見つけた。
    ~ has_key = true
    -> locked_room
+ {has_key} [木の扉の鍵を開ける]
    -> escape
+ {not has_key} [木の扉を開けようとする]
    扉は硬く閉ざされていて、開く気配がない。
    -> locked_room
```

完全なサンプルは [room_escape.ink](../../engine/assets/room_escape.ink) を参照してください。

### 4.5 公開ステータス変数 `public_status`

AI（ゲームマスター役）には原則として未解明のフラグやネタバレを渡しません（§4.3）。一方で、HP や所持金、現在地のように「プレイヤーにも常に見えていてよいステータス」だけは、AI が状況描写へ活用できるよう**明示的に公開する**仕組みが `public_status` 予約変数です。

#### (1) 予約変数としての宣言方法

ファイル先頭の `VAR` 宣言で、固定名 `public_status` を**文字列**として宣言します。

```ink
VAR public_status = "player_hp,location"
```

- 変数名は `public_status` 固定です（リネーム不可）。エンジンはこの名前を予約変数として認識します。
- 値は文字列リテラルで宣言します（数値・真偽値ではありません）。

#### (2) 書式：カンマ区切りで公開変数名を列挙

公開したいグローバル変数の名前を、**カンマ (`,`) 区切り**で列挙します。

- 列挙する各名前は、別途 `VAR` 宣言済みのグローバル変数名と完全に一致させること。
- 余分な空白は入れない（`"player_hp,location"` のように詰めて書く）。
- 公開するものが無いシナリオでは空文字 `""` とします（行ごと省略せず宣言は残す）。

#### (3) 原則：解法フラグは載せない

`public_status` に列挙してよいのは「プレイヤーに見せてもネタバレにならないステータス」だけです。**謎解きの解法やネタバレに繋がる変数は絶対に載せないでください。**

- 載せてよい例: `player_hp`（HP）、`gold`（所持金）、`location`（現在地）、`turn_count`（経過ターン）など、進行状況の指標。
- 載せてはいけない例: `has_key` / `is_door_open` / `knows_culprit` のような **`has_*` / `is_*` / `knows_*` 系の解法・進行フラグ**。これらが AI に渡ると、AI が答えを示唆してしまいゲームが破綻します。

判断に迷う場合は「この値をプレイヤー画面に常時表示しても謎の難易度が変わらないか？」を基準にしてください。変わるなら載せません。

#### (4) 出力からの除外

`public_status` 変数**自体**は、プレイヤー／AI へ渡る状態出力には含まれません（エンジンが除外します）。`public_status` はあくまで「どの変数を公開するか」を宣言するメタ情報であり、その宣言文字列そのものが描写に紛れ込むことはありません。AI に渡るのは `public_status` で指定された各変数の**現在値**だけです。

#### (5) 具体例

```ink
VAR player_hp = 20
VAR gold = 0
VAR location = "entrance"
VAR has_master_key = false       // 解法フラグ：公開しない

// player_hp / gold / location は公開。has_master_key は解法フラグなので含めない。
VAR public_status = "player_hp,gold,location"

-> entrance
```

この宣言により、AI には `player_hp` / `gold` / `location` の現在値のみが渡され、`has_master_key`（クリア解法に直結するフラグ）と `public_status` 自体は渡りません。

## 5. 開発時の運用ルール

新しいシナリオを追加・変更する際の標準フローです。

1. **設計**: 必要なフラグ（変数）とノット（場面）を洗い出す。
2. **実装**: `engine/assets/` に `.ink` を作成・編集する（本ガイド第 4 章の規約に従う）。
3. **コンパイル**: `pnpm build:ink` を実行し、エラーがないことを確認する。
4. **テスト**: `pnpm --filter engine test` を実行し、既存テストが壊れていないこと・追加したテストが通ることを確認する。
5. **コミット**: `.ink` と生成された `.json`（および追加テスト）を同一コミットに含める。
6. **レビュー**: PR では「デッドエンドがないか」「状態管理が Ink 内で完結しているか」を観点に含める。

### AI 支援によるシナリオ作成

本リポジトリには Ink シナリオ作成支援スキル `ink-scenario-creator`（[.rulesync/skills/ink-scenario-creator/](../../.rulesync/skills/ink-scenario-creator/SKILL.md)）が用意されています。AI エージェントにシナリオ作成を依頼する場合はこのスキルが利用され、本ガイドと同じ規約に沿った `.ink` が生成されます。

## 6. リファレンス

- Ink の基本構文: [.rulesync/skills/ink-scenario-creator/references/ink_basics.md](../../.rulesync/skills/ink-scenario-creator/references/ink_basics.md)
- Ink の高度な機能（Weave / Thread / List / 関数）: [.rulesync/skills/ink-scenario-creator/references/ink_advanced.md](../../.rulesync/skills/ink-scenario-creator/references/ink_advanced.md)
- プロジェクト固有パターン: [.rulesync/skills/ink-scenario-creator/references/adventure_mcp_patterns.md](../../.rulesync/skills/ink-scenario-creator/references/adventure_mcp_patterns.md)
- Ink 構文サンプル集: [docs/06-reference/inkfiles/](./inkfiles/)
- 公式ドキュメント: [Writing with Ink](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md)
