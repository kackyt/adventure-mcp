---
title: "PLAYBOOK"
version: "1.4.0"
status: "approved"
created: "2026-06-01"
updated: "2026-06-13"
owner: "kacky"
ace_entry_count: 10
tags: [ace, playbook, knowledge-management]
references:
  - docs/ACE_FRAMEWORK.md
  - docs/05-operations/deployment/ace-cycle.md
---

# ACE Playbook

> **Parent**: [BEST_PRACTICES.md](./BEST_PRACTICES.md) | **関連**: [ACE サイクル運用手順](../05-operations/deployment/ace-cycle.md) | [ACE フレームワーク概念](../../docs/ACE_FRAMEWORK.md)

## 概要

### 目的

ACE (Agentic Context Engineering) Playbook は、開発プロセスで得た知見を **AIツールが直接参照できる構造化形式** で蓄積するファイルです。

GitHub Discussions が「人間が読むためのナラティブ（物語的記録）」であるのに対し、Playbook は「AIが参照するための構造化知見（delta方式: 差分のみを末尾追記する更新方式）」として機能します。

### 運用ルール

| ルール                             | 説明                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **末尾追記のみ**                   | エントリは常にファイル末尾に追記。既存エントリの本文（Insight/Context/Action）書き換えは禁止。カウンター更新・Status変更は許可 |
| **カウンターはインクリメントのみ** | Helpful/Harmful は +1 のみ。減算・リセットはしない                                                                             |
| **削除禁止**                       | エントリを物理的に削除しない。不要な場合は `Status: deprecated` に変更                                                         |
| **800行超過時は分割**              | `playbook/` サブディレクトリにカテゴリ別ファイルとして分割                                                                     |
| **Frontmatter更新**                | エントリ追加時に `version`, `updated`, `ace_entry_count` を更新                                                                |
| **コミット規則**                   | `knowledge: ACE-XXX [category] [summary]` 形式で記録                                                                           |

### エントリID規則

ACE エントリ ID は **PRスコープ式** を採用する（このセクションが ID 規則の SSOT）。複数人・複数AIが並行で `/ace-curate` を回しても番号が衝突しないための構造である。

- **形式**: `ACE-<PR番号>-<連番>`（例: `ACE-438-1`, `ACE-438-2`）
- **非PR由来の fallback**: `ACE-i<Issue番号>-<連番>`（例: `ACE-i425-1`）
- **採番**: 同一 PR の既存 `ACE-<PR番号>-*` の最大連番 +1 を連番とする（既存が無ければ連番 `1`、すなわち最初のエントリは `ACE-<PR番号>-1`）。**全体の最新 ID を読む必要がない**ため並行採番でも衝突しない（PR 番号は GitHub が全体一意に採番するため、別 PR = 別 namespace）。
- **連番の範囲**: 1 回の `/ace-curate` で同一 PR から 1〜3 件追記する想定。同一 PR を再 curate する場合は既存の最大連番から継続。
- **既存 ID の扱い**: 旧 `ACE-{連番3桁}` 形式（`ACE-001`〜）のエントリは **改名しない**。旧 3 桁形式と新 PRスコープ式は恒久的に共存する（参照・anchor 互換の維持）。ID にファイル位置の情報は持たせないため、分割後も ID はそのまま維持する。

---

## カテゴリ一覧

| カテゴリ       | 説明                                               | 例                                |
| -------------- | -------------------------------------------------- | --------------------------------- |
| `coding`       | コーディングパターン、言語固有のベストプラクティス | 型安全性、エラーハンドリング      |
| `architecture` | 設計判断、構造上の決定事項                         | レイヤー設計、モジュール分割      |
| `testing`      | テスト戦略、テストパターン                         | モック設計、テストデータ管理      |
| `security`     | セキュリティ対策、脆弱性防止                       | 認証、暗号化、入力検証            |
| `performance`  | パフォーマンス最適化                               | キャッシュ、クエリ最適化          |
| `devops`       | CI/CD、デプロイ、環境構築                          | パイプライン、インフラ設定        |
| `process`      | 開発プロセス、ワークフロー改善                     | レビュー手法、タスク管理          |
| `tooling`      | ツール設定、開発環境                               | IDE設定、リンター、フォーマッター |

---

## ステータス定義

| ステータス   | 説明                                   | 遷移条件                                                |
| ------------ | -------------------------------------- | ------------------------------------------------------- |
| `active`     | 有効な知見                             | 新規作成時のデフォルト                                  |
| `deprecated` | 非推奨（古い情報、矛盾が発見された等） | Harmful >= 3 かつ Helpful < Harmful、または明示的な判断 |

---

## エントリテンプレート

新しいエントリを追記する際は、以下のテンプレートを使用してください：

```markdown
<a id="ace-XXX"></a>

### ACE-XXX: [タイトル（簡潔で検索しやすい表現）]

| フィールド | 値                                                                                    |
| ---------- | ------------------------------------------------------------------------------------- |
| Category   | coding / architecture / testing / security / performance / devops / process / tooling |
| Origin     | PR #XXX / Issue #YYY                                                                  |
| Date       | YYYY-MM-DD                                                                            |
| Helpful    | 0                                                                                     |
| Harmful    | 0                                                                                     |
| Status     | active                                                                                |

**Insight**: [知見の本質を1-2文で記述]

**Context**: [この知見が発見された状況・条件を記述]

**Action**: [推奨する具体的なアクション。可能であればコード例も含める]
```

### 記述ガイドライン

- **anchor**: 各エントリは見出し直前に `<a id="ace-XXX"></a>` を 1 行付与する。`XXX` は **エントリ ID を小文字化したもの**（新規は `ace-438-1` / `ace-i425-1`、旧エントリは `ace-001`。anchor 部分は常に小文字英数字＋ハイフン）。ファイルレベル参照（`PLAYBOOK.md` 単体）は常にファイル先頭に着地するため、anchor がなければ個別エントリへの誘導が成立しない。anchor 付与により他ドキュメントから `[ACE-438-1](path/to/PLAYBOOK.md#ace-438-1)` 形式で**特定エントリに直接ジャンプ可能**になる。
- **参照リンク形式**: 他ドキュメントから ACE エントリを参照する場合は `[ACE-XXX](path/to/PLAYBOOK.md#ace-XXX)` 形式に統一する（`XXX` はエントリ ID の接頭辞 `ACE-` / `ace-` を除いた部分。新規は `438-1`、旧は 3 桁 `040`。label は `ACE-438-1`、anchor は `#ace-438-1`）。`[PLAYBOOK ACE-XXX]` / `[PLAYBOOK.md ACE-XXX]` 等の異なる label は使わない（[ACE-040](#ace-040) 語彙統一 / [ACE-024](#ace-024) 用語衝突防止 の系。Origin: Issue [#425](https://github.com/feel-flow/ai-spec-driven-development/issues/425)）。
- **Insight**: 「何を学んだか」を簡潔に。1-2文。
- **Context**: 「どんな状況で発見したか」を記述。再現条件が明確であるほど価値が高い。
- **Action**: 「次回何をすべきか」を具体的に。コード例があると AIツールが直接適用しやすい。

---

## Helpful / Harmful カウンター運用

### カウンター更新タイミング

| タイミング                                     | 更新内容            |
| ---------------------------------------------- | ------------------- |
| ACE サイクルで既存エントリと重複する知見を発見 | Helpful +1          |
| 既存エントリの知見に従って問題を回避できた     | Helpful +1          |
| 既存エントリの知見に従ったが問題が発生した     | Harmful +1          |
| 既存エントリの内容が古くなっていると判明       | 検討の上 deprecated |

### エントリ品質の目安

| カウンター状態                           | 解釈                                       |
| ---------------------------------------- | ------------------------------------------ |
| `Helpful >= 5`                           | 高品質エントリ。PATTERNS.md への昇格を検討 |
| `Helpful >= 3, Harmful == 0`             | 良質なエントリ                             |
| `Harmful >= 3, Helpful < Harmful`        | deprecated 候補                            |
| `Helpful == 0, Harmful == 0`（90日以上） | 有効性未検証。次回関連タスクで意識的に検証 |

---

## ファイル分割ルール

Playbook が 800 行を超えた場合、以下のように分割する：

```
08-knowledge/
├── PLAYBOOK.md           ← 索引 + 運用ルール（200行程度）
└── playbook/
    ├── coding.md         ← Category: coding のエントリ群
    ├── architecture.md   ← Category: architecture のエントリ群
    ├── testing.md        ← Category: testing のエントリ群
    ├── security.md       ← Category: security のエントリ群
    ├── performance.md    ← Category: performance のエントリ群
    ├── devops.md         ← Category: devops のエントリ群
    ├── process.md        ← Category: process のエントリ群
    └── tooling.md        ← Category: tooling のエントリ群
```

分割時の手順：

1. カテゴリ別にエントリをサブファイルに移動
2. PLAYBOOK.md に索引テーブルを残す（エントリID + タイトル + 参照先）
3. 以降の新規追記は該当カテゴリのサブファイルに行う
4. Frontmatter の `ace_entry_count` は全エントリの合計を維持

---

## エントリ一覧

<!-- ここから下にエントリを追記してください。最新のエントリが末尾になるように追記します。 -->
<!-- 追記例:
<a id="ace-XXX"></a>

### ACE-XXX: N+1クエリの発生パターンと防止策

| フィールド | 値 |
|-----------|---|
| Category | performance |
| Origin | PR #42 |
| Date | 2026-03-15 |
| Helpful | 0 |
| Harmful | 0 |
| Status | active |

**Insight**: User モデルの関連を eager loading せずに一覧取得すると N+1 クエリが発生する。

**Context**: PR #42 のレビューで、ユーザー一覧APIのレスポンスタイムが3秒超になっていた。原因は各ユーザーの所属組織を個別クエリで取得していたこと。

**Action**: 一覧取得時は `include` オプションで関連を一括取得する。`findMany({ include: { organization: true } })`
-->

<a id="ace-4-1"></a>

### ACE-4-1: tsconfigの `noEmit` とディレクトリ設定の競合

| フィールド | 値 |
| ---------- | ------------ |
| Category   | tooling   |
| Origin     | PR #4 |
| Date       | 2026-06-05 |
| Helpful    | 0            |
| Harmful    | 0            |
| Status     | active       |

**Insight**: tsconfig.jsonで `noEmit: true`（型チェックのみ実施）とする場合、`outDir` や `rootDir` を指定すると設定が未使用となり混乱の元になる。

**Context**: TypeScriptのビルドを別ツール（tsxやesbuild等）で行うプロジェクトにおいて、出力先の設定が不要に残っていた。

**Action**: `noEmit: true` を設定する際は、`outDir` と `rootDir` の項目を削除し、設定を最小限に保つこと。

<a id="ace-4-2"></a>

### ACE-4-2: 自動レビューツールでの過剰な除外パス設定の罠

| フィールド | 値 |
| ---------- | ------------ |
| Category   | tooling   |
| Origin     | PR #4 |
| Date       | 2026-06-05 |
| Helpful    | 0            |
| Harmful    | 0            |
| Status     | active       |

**Insight**: `.coderabbit.yaml` などのレビュー除外パスに `!**/*.md` や `!**/*.yaml` などを指定すると、Playbookや設定ファイルなどの重要なガバナンスドキュメントもレビューされなくなる。

**Context**: PRでツールの設定ファイルやドキュメントを更新したのに、広範な拡張子除外により自動レビューがスキップされた。

**Action**: 除外対象は拡張子による広範な指定ではなく、`node_modules`、`dist`、`build` や生成ファイル（例: `*.generated.yaml`）などのノイジーなパスに限定する。

<a id="ace-4-3"></a>

### ACE-4-3: サブプロセス実行時のコマンドバリデーション

| フィールド | 値 |
| ---------- | ------------ |
| Category   | security   |
| Origin     | PR #4 |
| Date       | 2026-06-05 |
| Helpful    | 0            |
| Harmful    | 0            |
| Status     | active       |

**Insight**: `subprocess.run` 等で外部コマンドを呼び出す際、任意の入力をそのまま渡すと意図しないコマンドが実行されるリスクがある。

**Context**: スクリプト内のコマンド実行ラッパー関数において、入力が未検証のまま実行される状態になっていた。

**Action**: サブプロセス呼び出し前に、実行可能なコマンド（例: `gh` のみ）をホワイトリスト等でバリデーションする処理を入れる。

<a id="ace-5-1"></a>

### ACE-5-1: 関数の明示的な戻り値型の指定

| フィールド | 値 |
| ---------- | ------------ |
| Category   | coding       |
| Origin     | PR #5        |
| Date       | 2026-06-06   |
| Helpful    | 0            |
| Harmful    | 0            |
| Status     | active       |

**Insight**: 関数の戻り値型は `void` であっても明示的に定義することがスタイルガイドで必須とされている。

**Context**: TypeScriptスクリプトにて `function main() { ... }` の戻り値型が省略されたため、レビューで指摘された。

**Action**: 関数を定義する際は、戻り値がない場合でも `function main(): void { ... }` のように型を明示する。

<a id="ace-5-2"></a>

### ACE-5-2: コード内コメントの日本語記述の徹底

| フィールド | 値 |
| ---------- | ------------ |
| Category   | coding       |
| Origin     | PR #5        |
| Date       | 2026-06-06   |
| Helpful    | 0            |
| Harmful    | 0            |
| Status     | active       |

**Insight**: ロジックの内容を説明するソースコード上のインラインコメントは日本語で記述する。

**Context**: スクリプト内のコメントが英語で記述されていたため、日本語にするようレビューで指摘された。

**Action**: コメントを記述する際は、AI自身への説明や英語圏の慣習に引っ張られず、プロジェクトのスタイルガイドに従って日本語で記述する。

<a id="ace-5-3"></a>

### ACE-5-3: Node.jsネイティブ機能 (Type Strip) の優先利用

| フィールド | 値 |
| ---------- | ------------ |
| Category   | architecture |
| Origin     | PR #5        |
| Date       | 2026-06-06   |
| Helpful    | 0            |
| Harmful    | 0            |
| Status     | active       |

**Insight**: TypeScript ファイルの実行には、外部ツール（`tsx` など）よりも Node.js のネイティブ機能 (`--experimental-strip-types` または `node` コマンドの直接実行) の利用が優先される。

**Context**: `package.json` のスクリプトで `.ts` ファイルを直接 `node` で実行する設定に対し、AIレビュアーが `tsx` の使用を推奨したが、プロジェクト方針に従い不要とされた。

**Action**: スクリプト実行環境を追加する際は、可能な限りバンドラーや `tsx` などの外部ツールに依存せず、最新の Node.js の機能を利用する構成にする。

<a id="ace-6-1"></a>

### ACE-6-1: Inkフォールバック選択肢の遷移先の明示

| フィールド | 値 |
| ---------- | ------------ |
| Category   | coding       |
| Origin     | PR #6        |
| Date       | 2026-06-13   |
| Helpful    | 0            |
| Harmful    | 0            |
| Status     | active       |

**Insight**: Ink のシナリオでフォールバック選択肢（常に表示される選択肢）を記述する際、遷移先（divert target, `->`）を明示しないと文法エラーやコンパイルエラーの原因になる。

**Context**: PR #6 のドキュメント作成時、`+` のみのフォールバック選択肢に遷移先が指定されていない例があり、AI レビュアーから構文上の問題として指摘された。

**Action**: フォールバック選択肢を記述する際は、`+ -> fallback_knot` のように必ず遷移先ノットを指定し、デッドエンドを避ける構成にする。

<a id="ace-6-2"></a>

### ACE-6-2: InkとMCP間の状態管理の責務分担

| フィールド | 値 |
| ---------- | ------------ |
| Category   | architecture |
| Origin     | PR #6        |
| Date       | 2026-06-13   |
| Helpful    | 0            |
| Harmful    | 0            |
| Status     | active       |

**Insight**: アイテム取得やフラグ更新などの状態遷移は、AI（MCP側）に委ねずすべて Ink 側（`.ink` ファイル内）の変数操作として完結させる。

**Context**: PR #6 の Ink シナリオ作成ガイドにて、AI はエンジンが提示した選択肢から選ぶだけであり、状態更新は自律的に行わないという設計原則が明文化された。

**Action**: シナリオ開発時は、AI による状態更新アクションを設計せず、フラグやステータスの変更は必ず `~ has_key = true` のように Ink 内の記述として実装する。

<a id="ace-8-1"></a>

### ACE-8-1: TUI使用時のクリーンアップ処理の徹底

| フィールド | 値           |
| ---------- | ------------ |
| Category   | coding       |
| Origin     | PR #8        |
| Date       | 2026-06-13   |
| Helpful    | 0            |
| Harmful    | 0            |
| Status     | active       |

**Insight**: TUIライブラリ（neo-blessed等）を使用する際、強制終了時の画面クリーンアップ処理を怠るとターミナルの表示が崩れる原因となる。

**Context**: PR #8で全画面TUIを導入した際、`Ctrl+C` (SIGINT) で終了するとターミナルが乱れたままになる問題がAIレビューで指摘された。

**Action**: `process.on("SIGINT", () => { screen.destroy(); process.exit(0); })` のようにシグナルハンドラを設定し、終了時に確実なクリーンアップを行うこと。

<a id="ace-8-2"></a>

### ACE-8-2: ヘッドレスコントローラによるUI依存の排除

| フィールド | 値           |
| ---------- | ------------ |
| Category   | architecture |
| Origin     | PR #8        |
| Date       | 2026-06-13   |
| Helpful    | 0            |
| Harmful    | 0            |
| Status     | active       |

**Insight**: TUI等のUIツールを導入する際は、表示層（View）とゲーム進行ロジック（Controller）を分離し、UIに依存しないテストが可能な設計にする。

**Context**: PR #8で対話CLIを行ベースから全画面TUIへ移行した際、ゲームの進行管理をヘッドレスな `GameController` に分離することで堅牢なユニットテストを実現した。

**Action**: UIを持つツールを実装する際は、ロジックを直接Viewに記述せず、ヘッドレスで動作するController層を設ける。
