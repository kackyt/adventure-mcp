# Firebase Hosting & GCS シナリオ配信 デプロイ手順

> **Parent**: [DEPLOYMENT.md](../DEPLOYMENT.md)

web パッケージ（ブラウザ単体で動くプレイ UI）を Firebase Hosting へ公開し、シナリオ JSON を
Google Cloud Storage（GCS）バケットから CORS 経由で配信するための手順書です。
GitHub Actions は使わず、人間の判断で 1 コマンドデプロイする運用（Issue #23 / #26）を前提とします。

---

## 1. 構成の全体像

```text
プレイヤーのブラウザ
  ├── Firebase Hosting  … web/dist（Vite ビルド成果物・静的 SPA）
  └── GCS バケット      … scenarios.json（一覧インデックス）+ <id>.json（コンパイル済み Ink）
```

- サーバーサイドのバックエンドは無し。ゲーム進行はブラウザ内の engine (inkjs) が行う
- 固定費ゼロ。課金はアクセスに応じた微小な転送量のみ
- シナリオの追加・差し替えは GCS へのアップロードのみで完結（Hosting の再デプロイ不要）

## 2. 前提ツール

| ツール | 用途 | 備考 |
| --- | --- | --- |
| pnpm | ビルド・デプロイスクリプトの実行 | リポジトリ標準 |
| firebase-tools | Firebase Hosting へのデプロイ | `web` の devDependencies に含まれる |
| gcloud CLI | GCS バケットの作成・CORS・IAM 設定 | [インストール手順](https://cloud.google.com/sdk/docs/install) |

## 3. 初回セットアップ

### 3.1 Firebase プロジェクト

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成する
2. `web/.firebaserc` にプロジェクト ID を設定する。このファイルは gitignore 対象のため
   クローン直後は存在しない。無ければ以下の内容で新規作成する

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

3. デプロイ用アカウントでログインする

```bash
pnpm --filter web exec firebase login
```

4. Hosting ターゲット `web` を実サイトへ対応付ける

```bash
# <site-id> は Firebase コンソール → Hosting のサイト ID（既定サイトならプロジェクト ID と同じ）
pnpm --filter web exec firebase target:apply hosting web <site-id>
```

`web/firebase.json` が `"target": "web"` を指定しているため、この対応付けは必須です。
実行すると `web/.firebaserc` に `targets` が追記されます（このファイルは gitignore 対象なので、
環境ごとに 1 回ずつ実行が必要）。未設定のままデプロイすると
`Hosting target web not detected` で失敗します。

### 3.2 GCS バケット（シナリオ配信）

バケット名は例として `adventure-mcp-scenarios` とします（世界で一意な名前に読み替えてください）。

```bash
# バケット作成（公開静的配信用・均一アクセス制御）
gcloud storage buckets create gs://adventure-mcp-scenarios \
  --location=asia-northeast1 \
  --uniform-bucket-level-access

# 匿名公開（allUsers に Storage Object Viewer を付与）
gcloud storage buckets add-iam-policy-binding gs://adventure-mcp-scenarios \
  --member=allUsers \
  --role=roles/storage.objectViewer

# CORS 設定の適用（リポジトリ同梱の infra/gcs-cors.json を使用）
gcloud storage buckets update gs://adventure-mcp-scenarios \
  --cors-file=infra/gcs-cors.json
```

`infra/gcs-cors.json` は GET/HEAD のみを全オリジンに許可します。配信物は元々匿名公開の
静的 JSON なので実害はありませんが、絞りたい場合は `origin` を Hosting の URL
（`https://<project-id>.web.app` など）とローカル開発用 `http://localhost:5173` に限定してください。

### 3.3 適用結果の確認

```bash
gcloud storage buckets describe gs://adventure-mcp-scenarios \
  --format="json(cors_config,iamConfiguration)"
curl -H "Origin: https://example.com" -I \
  "https://storage.googleapis.com/adventure-mcp-scenarios/scenarios.json"
# レスポンスに access-control-allow-origin が含まれること
```

## 4. シナリオのアップロード

公開対象は「コンパイル済み JSON」だけです（`.ink` ソースは解の逆算防止のため公開しない）。

```bash
# 1. Ink をコンパイル（engine/assets/*.json を再生成）
pnpm --filter ./engine build:ink

# 2. 一覧インデックスの雛形をローカル生成（web/public/scenarios/scenarios.json）
pnpm --filter web sync:scenarios

# 3. scenarios.json の title / description を人が編集してからアップロード
gcloud storage cp engine/assets/*.json gs://adventure-mcp-scenarios/
gcloud storage cp web/public/scenarios/scenarios.json gs://adventure-mcp-scenarios/

# 4. インデックスは更新が即時反映されるようキャッシュを無効化しておく
gcloud storage objects update gs://adventure-mcp-scenarios/scenarios.json \
  --cache-control="no-cache"
```

`scenarios.json` の形式:

```json
{
  "schemaVersion": 1,
  "scenarios": [
    {
      "id": "sewing_box_seam",
      "title": "縫い目のあいだに",
      "description": "19 世紀ロンドンの裁縫箱をめぐる長編ミステリ"
    }
  ]
}
```

- `id` は `engine/assets/<id>.json` のファイル名（snake_case）と一致させる
- インデックスに載せたシナリオだけが Web で選択可能になる（載せなければ非公開のまま）

## 5. 環境変数の注入（ビルド時）

`web/.env.production` を作成します（`web/.env.example` 参照。Vite が本番ビルド時に読み込む）。

```bash
# web/.env.production
VITE_SCENARIO_BASE_URL=https://storage.googleapis.com/adventure-mcp-scenarios
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

- `VITE_GA_MEASUREMENT_ID` は未設定でもよい（その場合は計測なしで正常動作する）
- `.env.production` はコミットしない（計測 ID を変えたいときはローカルで編集して再デプロイ）

## 5.1 Google Analytics（GA4）で取れるデータ

`VITE_GA_MEASUREMENT_ID` を設定してデプロイすると、gtag.js による自動計測に加えて、
アプリが以下のカスタムイベントを送出します（`web/src/store/game-store.ts`）。

| イベント名 | 送出タイミング | パラメータ |
| --- | --- | --- |
| `scenario_start` | シナリオ開始成功時 | `scenario_id` |
| `scenario_complete` | 終端（`ended`）到達時 | `scenario_id` / `turns`（総ターン数） |
| `save_export` | セーブ文字列の書き出し時 | `scenario_id` |
| `save_import` | セーブ文字列のインポート成功時 | `scenario_id` |
| `resume_autosave` | 「続きから」での再開成功時 | `scenario_id` |

これにより「どのシナリオがどれだけ開始・完走されたか」「セーブ／続きからの利用度」を追えます。

> **SPA の注意**: URL が変わらない構成のため、gtag.js の自動 `page_view` は初回ロードの
> 1 回のみ発火します。画面遷移（一覧↔プレイ）の粒度は上記カスタムイベントで捕捉します。

### カスタムイベントを GA4 レポートで使えるようにする

送出しただけではレポートの軸（ディメンション／指標）に出ません。以下を一度だけ設定します。

1. **即時確認（DebugView）**: 公開 URL に `?debug_mode=1` を付けてアクセスすると、
   GA4 管理画面の **管理 → DebugView** にイベントがリアルタイムで流れる（アプリが
   この URL パラメータを検出して gtag の `debug_mode` を有効化する。ブラウザ拡張は不要）。
   まずはここで送出を確認する。拡張「Google Analytics Debugger」を使っても同じ。
2. **カスタムディメンション登録**（`scenario_id` を軸にする場合）:
   管理 → **データの表示 → カスタム定義 → カスタムディメンションを作成**。
   - ディメンション名: `scenario_id` / 範囲: **イベント** / イベントパラメータ: `scenario_id`
3. **カスタム指標登録**（`turns` を平均プレイ長などに使う場合）:
   同じ「カスタム定義」で **カスタム指標を作成**。
   - 指標名: `turns` / 範囲: イベント / イベントパラメータ: `turns` / 単位: 標準
4. **主要イベント（旧コンバージョン）に指定**（任意）:
   管理 → **イベント** で `scenario_complete` を「主要イベント」にすると完走率を追いやすい。

> カスタム定義の反映と通常レポートへの集計は**登録の翌日以降**（最大 24〜48 時間）になります。
> 当日に確認したいときは DebugView か「探索」レポートを使ってください。

## 6. デプロイ

```bash
pnpm --filter web deploy:firebase
```

これ 1 コマンドで Vite の静的ビルド（`web/dist/`）と `firebase deploy --only hosting` が実行されます。
完了すると公開 URL（`https://<project-id>.web.app`）が表示されます。

### デプロイ後の動作確認

1. 公開 URL に匿名（シークレットウィンドウ）でアクセスする
2. シナリオ一覧が表示され、選択して開始できる
3. 選択肢を選んで進行し、ブラウザをリロード →「続きから」で再開できる
4. 終端まで到達すると終了表示になる

## 7. 補足・トラブルシューティング

| 症状 | 原因と対処 |
| --- | --- |
| 一覧が「形式が不正」エラー | `scenarios.json` のスキーマ不一致（4 章の形式を確認） |
| 一覧は出るが本文取得で HTTP 404 | インデックスの `id` に対応する `<id>.json` が未アップロード |
| CORS エラー（blocked 表示） | 3.2 の CORS 適用漏れ、または origin 制限が厳しすぎる |
| 差し替えたのに古いシナリオが出る | GCS のキャッシュ。対象 JSON にも `no-cache` を適用 |
| `firebase deploy` が対話プロンプトで止まる | `web/.firebaserc` のプロジェクト ID 未設定。3.1 を実施 |
| `Hosting target web not detected` | `firebase target:apply hosting web <site-id>` 未実行。3.1 の手順 4 を実施 |

- `web/public/scenarios/` はローカル開発専用（gitignore 済み）。Hosting へは
  `web/firebase.json` の `ignore` 設定によりアップロードされない
- ロールバックは Firebase コンソールの Hosting リリース履歴から即時に戻せる
