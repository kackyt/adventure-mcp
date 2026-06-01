# ACE サイクル運用手順（Generate → Reflect → Curate）

> **Parent**: [DEPLOYMENT.md](../DEPLOYMENT.md) | **Workflow Step**: 10
> **関連**: [knowledge-management.md](./knowledge-management.md) | [PLAYBOOK.md](../../08-knowledge/PLAYBOOK.md) | [ACE フレームワーク概念](../../../docs/ACE_FRAMEWORK.md)

## 概要

ACE (Agentic Context Engineering) サイクルは、マージ後・cleanup 後に AIツールと協力して知見を抽出・評価・記録する運用手順です。

**目的**: 開発で得た知見を構造化し、AIツールが次回タスクで自動参照できる Playbook エントリとして永続化する

**実行タイミング**: マージ後・cleanup 後（develop ブランチで実行）

### 運用パターン

ACE 知見コミットのマージ方針は **[git-workflow.md ステップ10 §運用パターン（マージ方針）](./git-workflow.md#ace-merge-policy)** を SSOT とする。要約：

- **既定（推奨）**: develop に直接 commit + push（PLAYBOOK.md は append-only ＋ PRスコープ式 ID で衝突しない）。
- **任意エスカレーション**: 大人数チーム / 知見レビューを残したい場合のみ `chore/ace-from-pr-<PR番号>` の小 PR。
- ここでの develop 直 push は `knowledge:` 付き PLAYBOOK 単独コミットに限った意図的フローであり、[ACE-012](../../08-knowledge/PLAYBOOK.md#ace-012)（うっかり develop 直 push の事故防止）とは別物。

**autonomous（任意）**: subagent と専用 worktree で ACE キャプチャを非同期化するパターン。導入は [ace-autonomous.md](./ace-autonomous.md) と `docs-template/scripts/ace/` のテンプレートを参照（Issue [#367](https://github.com/feel-flow/ai-spec-driven-development/issues/367)）。

**所要時間**: 5〜15分（AIツール支援あり）

---

## Phase 1: Generate（知見抽出）

### 対象データ

| データソース     | 取得方法                                              | 主な知見                                                                                                                                 |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| PR diff          | `gh pr diff ${PR_NUMBER}`                             | コード変更のパターン、設計判断                                                                                                           |
| PR description   | `gh pr view ${PR_NUMBER} --json body`                 | spec にない判断 / spec から変更した点 / 捨てた選択肢（implementation-notes 転記済み、[ACE-034](../../08-knowledge/PLAYBOOK.md#ace-034)） |
| Issue 内容       | `gh issue view ${ISSUE_NUM}`                          | 元々の課題、要件                                                                                                                         |
| レビューコメント | `gh api repos/OWNER/REPO/pulls/${PR_NUMBER}/comments` | 指摘事項、改善点                                                                                                                         |
| CI/CD ログ       | GitHub Actions の結果                                 | ビルド・テストの教訓                                                                                                                     |

### AIプロンプトテンプレート

```
以下のPR情報を分析し、将来の開発で役立つ知見を抽出してください。

## PR情報
- PR: #${PR_NUMBER}
- Issue: #${ISSUE_NUM}
- タイトル: ${PR_TITLE}

## 分析観点
1. **コーディングパターン**: 採用した設計判断とその理由
2. **テスト戦略**: テストの書き方で得た教訓
3. **セキュリティ**: 脆弱性対策の知見
4. **パフォーマンス**: 最適化のヒント
5. **アーキテクチャ**: 構造上の決定事項
6. **プロセス**: ワークフロー・ツール活用の改善点
7. **判断ログ**: spec にない判断 / spec から変更した点 / 捨てた選択肢（#1「採用した判断」を補完するレイヤ。データソースは上記表「PR description」行、[ACE-034](../../08-knowledge/PLAYBOOK.md#ace-034)。カテゴリは `process` または `architecture` を推奨。試行中: [Issue #421](https://github.com/feel-flow/ai-spec-driven-development/issues/421)、5 PR で評価）

## 出力形式
各知見について以下を出力してください:
- タイトル（簡潔で検索しやすい）
- カテゴリ（coding/architecture/testing/security/performance/devops/process/tooling）
- Insight（知見の本質 1-2文）
- Context（発見した状況）
- Action（推奨アクション）
- 汎用性（汎用的 / プロジェクト固有）
- 再現性（高 / 中 / 低）
- 影響度（高 / 中 / 低）
```

### 出力例

```
## 知見候補 1
- タイトル: Prisma の findMany で関連を eager loading しないと N+1 になる
- カテゴリ: performance
- Insight: ユーザー一覧取得時に関連テーブルを include しないと N+1 クエリが発生
- Context: PR #42 でユーザー一覧APIのレスポンスが3秒超に
- Action: findMany 使用時は include オプションを必ず検討する
