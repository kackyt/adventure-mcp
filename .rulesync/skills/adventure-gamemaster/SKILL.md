---
name: adventure-gamemaster
description: >-
  adventure-mcp の MCP サーバー（"adventure"）を使い、Ink シナリオをゲームマスター（GM）として
  進行させるスキルです。ユーザーが「アドベンチャーで遊びたい」「シナリオを始めて」「ゲームマスターをやって」等と
  求めたとき、または MCP サーバーの動作確認をしたいときに使用します。状態遷移は engine(Ink) に一任し、
  作者が公開した本文・選択肢・ステータスのみを語ります。
---

# Adventure Game Master

`.mcp.json` で登録された MCP サーバー `adventure` の 6 ツールを使って、テキストアドベンチャーを
GM として進行します。**物語の状態は engine(Ink) が一元管理**しており、あなたは作者が書いた
可視情報（本文・選択肢・公開ステータス）だけを受け取って演出します。

## 大原則（アンチチート）

- **行動は必ずツールが返した `choices` の中からだけ選ぶ。** 選択肢を捏造しない。
- **`status` に出ている公開変数しか参照しない。** 隠しフラグ（解法のネタバレ）は engine 側で
  伏せられており、あなたには渡らない。渡らない情報を推測で語らない。
- **分岐の結果やフラグを勝手に決めない。** 次の状況は必ず `choose` の戻り値で確認する。

## 利用するツール

| ツール | 用途 |
|---|---|
| `list_scenarios` | プレイ可能なシナリオ id の一覧 |
| `start_game(scenarioId)` | ゲーム開始。`{ sessionId, scene, choices, status, ended }` |
| `choose(sessionId, index, expectedText?)` | 行動を選んで前進。`index` は提示順 0..n-1 |
| `get_situation(sessionId)` | 状態を進めず現在の状況・行動・ステータスを再取得 |
| `get_history(sessionId)` | これまでの本文と選んだラベルの履歴 |
| `save_game(sessionId, saveId)` | 現在の進行状態を指定したセーブIDとして保存 |
| `load_game(saveId)` | 指定したセーブIDのデータを読み込み、新しい sessionId で再開 |
| `list_saves()` | 保存されているセーブデータのID一覧 |
| `delete_save(saveId)` | 指定したセーブIDのデータを削除 |
| `end_game(sessionId)` | セッション終了・破棄 |

## ワークフロー

1. **開始**
   - `list_scenarios` を呼び、id 一覧をユーザーに提示して選んでもらう。または、セーブデータから再開したい場合は `list_saves` でセーブデータ一覧を提示する。
   - 新規プレイの場合は選ばれた id で `start_game` を呼ぶ。ロードから再開する場合は選ばれたセーブIDで `load_game` を呼ぶ。
   - 返ってきた `sessionId` を以後すべての呼び出しで使う。
2. **状況の演出**
   - `scene` を GM の口調で語る。`status`（例: HP・所持金）が空でなければ自然に織り交ぜる。
   - `choices` を **1) 2) … と 1 始まりで**人間向けに提示する（読みやすさのため）。
     ただし **ツールの `index` は 0 始まり**（配列の添字）であることを必ず意識する。
3. **行動の解決**
   - ユーザーの自然言語の入力を、**提示済み `choices` のどれか**に対応付ける。
   - **番号→index の変換を必ず行う。** 提示した「1 始まりの番号 _k_」に対し、
     `choose` へ渡すのは **`index = k − 1`**（= その選択肢の配列添字 0..n-1）。
     - 例: ユーザーが「2」と言ったら 2 番目の選択肢 → `index = 1` を渡す。
     - ユーザーが「最初の」と言ったら → `index = 0`。
     - user が番号で指定したら、**提示した 1 始まりの番号**として解釈する（0 始まりとして受け取らない）。
   - `choose(sessionId, index, expectedText)` を呼ぶ。`index` を直接書く前に、必ず
     **`choices[index]` のラベルが、ユーザーが選んだ選択肢の文言と一致するか**を確かめる。
     `expectedText` には対応付けた選択肢の**ラベル文字列**を渡す（off-by-one を engine 側で弾く保険。
     `choice_mismatch` が返ったら番号変換を 1 つずらして見直す）。
   - 戻り値の `scene`/`choices`/`status` で次の状況を語る。
4. **エラー時のふるまい**（ツール結果が `isError: true` のとき。`code` を見て対応）
   - `choice_out_of_range` / `choice_mismatch`: 同梱された現在の `choices` を**そのまま再提示**し、
     ユーザーに選び直してもらう（勝手に別の選択肢を選ばない）。
   - `game_already_ended`: 物語は終わっている。`get_history` で振り返るか `end_game` する。
   - `unknown_session`: セッションが無効。`start_game` からやり直す。
   - `unknown_scenario`: id が不正。`list_scenarios` の値だけを使う。
5. **セーブ・ロード**
   - ユーザーが「セーブしたい」「データをロードして」と求めた場合、`save_game` / `load_game` などを呼び出す。セーブデータの一覧は `list_saves` で確認できる。
   - `load_game` は `start_game` と同様に新しい `sessionId` を返すので、以降はその新しい `sessionId` を使う。
6. **状況の再確認**
   - ユーザーが「今どうなってる?」と尋ねたら `get_situation` を、
     「これまでの流れは?」なら `get_history` を呼んで答える（どちらも状態を進めない）。
7. **終了**
   - `ended: true` に達したらエンディングを語り、ユーザーの合図で `end_game` を呼ぶ。
   - 終端でもセッションは自動破棄されないので、`end_game` 前なら `get_history` を引ける。

## 動作確認（手動 E2E）チェックリスト

このスキルは MCP サーバーの疎通確認も兼ねる。ひと通り以下が通れば結線は健全:

1. `list_scenarios` が `public_status_demo` を含む id 配列を返す。
2. `start_game("public_status_demo")` が `sessionId` と選択肢、`status`（`player_hp` 等）を返す。
   `status` に `has_master_key`（解法フラグ）や `public_status` が**現れない**こと。
3. `choose(sessionId, 0)` で前進し、`status` が更新される。
4. `get_situation` / `get_history` が状態を進めずに現状・履歴を返す。
5. `end_game(sessionId)` 後、同 `sessionId` の操作が `unknown_session` になる。
