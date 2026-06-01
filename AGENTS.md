## ACE (Agentic Context Engineering) 運用ルール

### PLAYBOOK.md の配置場所

- パス: `docs/08-knowledge/PLAYBOOK.md`

### ACEサイクル手順（PRマージ後に実行）

PRマージ後に以下の3フェーズを実行してください:

#### Phase 1: Generate（知見抽出）

対象PRの diff、Issue内容、レビューコメントを分析し、将来の開発で役立つ知見候補を抽出する。

分析観点:

1. コーディングパターン: 採用した設計判断とその理由
2. テスト戦略: テストの書き方で得た教訓
3. セキュリティ: 脆弱性対策の知見
4. パフォーマンス: 最適化のヒント
5. アーキテクチャ: 構造上の決定事項
6. プロセス: ワークフロー・ツール活用の改善点

#### Phase 2: Reflect（評価・分類）

各知見候補について以下を評価する:

- 再現性が「中」以上か（低ならスキップ）
- 影響度が「中」以上か（低ならスキップ）
- 既存 Playbook エントリと重複しないか（重複なら Helpful +1）
- 既存エントリと矛盾しないか（矛盾なら既存を deprecated にして新規作成）

評価マトリクス:

| 基準   | 判定                      |
| ------ | ------------------------- |
| 汎用性 | 汎用的 / プロジェクト固有 |
| 再現性 | 高 / 中 / 低              |
| 影響度 | 高 / 中 / 低              |
| 新規性 | 新規 / 重複 / 矛盾        |

#### Phase 3: Curate（増分更新）

PLAYBOOK.md のエントリ一覧セクション末尾に新エントリを追記する。

### エントリフォーマット

`ACE-XXX` の `XXX` は **PRスコープ式 ID** に置換する: `ACE-<PR番号>-<連番>`（例 `ACE-438-1`、非PR由来は `ACE-i<Issue番号>-<連番>` 例 `ACE-i425-1`）。採番は対象 PR の既存 `ACE-<PR番号>-*` の最大連番 +1（既存が無ければ連番 `1`、すなわち `ACE-438-1`）で、全体の最新 ID を読む必要がない（並行採番でも衝突しない）。anchor は ID を小文字化した `<a id="ace-438-1"></a>` を見出し直前に付与する。

```markdown
### ACE-XXX: [タイトル]

| フィールド | 値 |
|-----------|---|
| Category | coding / architecture / testing / security / performance / devops / process / tooling |
| Origin | PR #XXX / Issue #YYY |
| Date | YYYY-MM-DD |
| Helpful | 0 |
| Harmful | 0 |
| Status | active |

**Insight**: [知見の本質を1-2文で記述]

**Context**: [この知見が発見された状況・条件を記述]

**Action**: [推奨する具体的なアクション]
```

### 運用ルール

#### 末尾追記ルール

- エントリは常にファイル末尾（Changelog セクションの直前）に追記する
- 既存エントリの本文（Insight/Context/Action）の書き換えは禁止
- カウンター更新と Status 変更のみ許可

#### カウンター運用ルール

- Helpful/Harmful は **+1（インクリメント）のみ**。減算・リセットはしない
- `Harmful >= 3` かつ `Helpful < Harmful` の場合、`deprecated` を検討する
- `Helpful >= 5` は高品質エントリ（PATTERNS.md への昇格を検討）

#### Frontmatter 更新ルール

エントリ追加時に以下を更新する:

- `version`: マイナーバージョンをインクリメント
- `updated`: 今日の日付
- `ace_entry_count`: 全エントリ数（deprecated 含む）

#### コミットメッセージ規則

- 形式: `knowledge: ACE-<PR番号>-<連番> [category] [summary]`（例 `knowledge: ACE-441-1 [testing] ...`）
- 複数エントリ: `knowledge: ACE-441-1,ACE-441-2 [category1,category2] [summary]`
- カウンター更新のみ: `knowledge: ACE-016 [category] helpful+1`

### 既存エントリ照合手順

新規知見を追記する前に、PLAYBOOK.md の既存エントリを確認し:

1. 同じテーマのエントリが存在するか検索する
2. 重複する場合は既存エントリの `Helpful` を +1 する
3. 矛盾する場合は既存エントリの `Status` を `deprecated` に変更し、新エントリを作成する
4. 新規の場合のみ末尾に追記する
