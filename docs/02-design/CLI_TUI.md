---
title: "CLI_TUI"
version: "1.0.0"
status: "draft"
owner: "kacky"
created: "2026-06-13"
updated: "2026-06-13"
---

# CLI_TUI.md - CLI 全画面 TUI 化 設計書

デバッグ用 CLI（`cli` パッケージ）を、メッセージを追記していく行ログ形式から、
ステータス・本文・選択肢を画面上で上書き更新する全画面 TUI に再設計する。

## 1. 目的

- アドベンチャーゲームとして見やすい画面（ステータスバー + 現在シーン本文 + 選択肢）を提供する。
- Ink 変数の状態をリアルタイムに可視化し、シナリオのデバッグ性を高める。
- ビルドレス実行（`node --experimental-transform-types`）とテスト容易性を維持する。

## 2. 決定事項サマリ

| # | 論点 | 決定 |
|---|------|------|
| 1 | レイアウト | 全画面 TUI（alt スクリーン、ステータスバー + シーン本文 + 選択肢の固定領域） |
| 2 | フレームワーク | neo-blessed（JSX 不要 → ビルドレス実行を維持） |
| 3 | テスト戦略 | ヘッドレスコントローラ分離（View はフェイクで差し替え可能） |
| 4 | 非TTY | TTY 自動判定 + line フォールバック（同一コントローラを別 View で駆動、`--plain` で明示切替） |
| 5 | 入力方式 | ↑↓ + Enter / 数字直接 / `:` でコマンドモード |
| 6 | ステータス内容 | 全 Ink 変数を自動列挙 |
| 7 | engine API | `getVariables(): Record<string, unknown>` スナップショット |
| 8 | 本文履歴 | 現在シーンのみ表示。履歴は内部保持し将来 `:history` で呼べる設計 |
| 9 | 終了UX | 即終了（q / Esc / Ctrl+C / `:quit`）。端末復元は非交渉前提 |
| 10 | 配色 | 最小限（枠 / 見出し / 選択ハイライト / エラー赤） |
| 11 | UI 状態保持 | リッチコントローラ（mode / カーソル / コマンドバッファ / 直近メッセージまで保持） |

## 3. アーキテクチャ

```text
入力(キー/行) ──▶ View(blessed | line) ──Action──▶ GameController(ヘッドレス)
                      ▲                                   │
                      └──────── ViewModel ◀───────────────┘
                                                          │
                                                  PlayableEngine(engine)
```

単一方向データフロー。View はキーを `Action` に翻訳してコントローラへ渡すだけ。
コントローラが状態遷移し、不変スナップショットの `ViewModel` を返す。View はそれを描画する。
blessed View は「描画 + 生キー転送」の薄いアダプタになり、ロジックはすべてコントローラ側でテストできる。

## 4. 中心となる契約（型）

```ts
// controller/view-model.ts
export interface ViewModel {
  mode: "choosing" | "command" | "ended";
  status: { variables: Record<string, unknown> }; // 全変数スナップショット
  scene: string; // 現在シーン本文
  choices: { label: string; selected: boolean }[];
  command: { active: boolean; buffer: string }; // コマンドモードの入力中バッファ
  message: { kind: "info" | "error"; text: string } | null; // :get 結果やエラー
  ended: boolean;
}

export type Action =
  | { type: "moveUp" }
  | { type: "moveDown" }
  | { type: "confirm" } // ハイライト中の選択肢を決定
  | { type: "selectIndex"; index: number } // 数字キー直接選択
  | { type: "enterCommandMode" } // ':'
  | { type: "commandInput"; char: string } // コマンドモードで1文字入力
  | { type: "commandBackspace" }
  | { type: "commandSubmit" } // Enter: 内部バッファを parse して適用
  | { type: "commandCancel" } // Esc: コマンドモード解除
  | { type: "runCommand"; raw: string } // line View 用: 1行を一括 parse 適用
  | { type: "quit" };
```

コントローラ API:

```ts
class GameController {
  constructor(engine: PlayableEngine); // 起動時に最初のシーンまで前進
  apply(action: Action): void; // 状態遷移
  getViewModel(): ViewModel; // 描画用スナップショット
  get exitRequested(): boolean; // quit 検知 → driver が後始末して exit 0
}
```

内部状態: `history: string[]`（表示しないが将来の `:history` 用に蓄積）、`currentScene`、
`choices`、`mode`、`selectedIndex`、`commandBuffer`、`message`。

`:` コマンドは既存の `commands/input-parser.ts` を再利用し、`Command` → 状態変更ロジックを
コントローラに集約する。

## 5. engine への追加（唯一の共有パッケージ変更）

```ts
// engine/src/domain/services/scenario-engine.ts
/** 全グローバル変数のスナップショットを取得する。 */
getVariables(): Record<string, unknown> {
  try {
    const state = this.story.variablesState;
    const out: Record<string, unknown> = {};
    for (const name of Object.keys(state)) out[name] = state[name];
    return out;
  } catch (e) {
    throw new EngineError("Failed to get variables", e);
  }
}
```

inkjs `VariablesState` は Proxy の `ownKeys` / `getOwnPropertyDescriptor` を実装しており、
`Object.keys()` で全グローバル変数名を列挙できる。`PlayableEngine` インターフェースにも
`getVariables` を追加する。

## 6. blessed レイアウト

```text
┌─ 脱出ゲーム ──────────────── 鍵:✕ ┐   ← status box (全変数, 上部固定)
│                                  │
│  あなたは鍵のかかった部屋に      │   ← scene box (現在シーン, 領域内スクロール)
│  閉じ込められている。            │
│  頑丈な木の扉と机がある。        │
│                                  │
├──────────────────────────────────┤
│ ▸ 1) 机を調べる                  │   ← choices list (↑↓ ハイライト)
│   2) 木の扉を開けようとする      │
└──────────────────────────────────┘
 [getVar] has_key = false           ← message line (info/error)
入力> _                             ← command line (':' で活性化)
```

パーセント指定のボックスで構成し、`screen.on('resize')` 時に現在 ViewModel を再描画する。

## 7. ファイル構成

```text
cli/src/
├── index.ts                      # 引数 / ファイル / TTY 判定 → controller + View を結線
├── controller/
│   ├── view-model.ts             # ViewModel / Action 型
│   ├── game-controller.ts        # ヘッドレスロジック（テスト対象の中核）
│   └── game-controller.spec.ts
├── commands/
│   └── input-parser.ts (+spec)   # 既存流用: ":" コマンド → Command
└── views/
    ├── game-view.ts              # View インターフェース
    ├── blessed-view.ts           # neo-blessed アダプタ（手動検証）
    ├── line-view.ts              # 非TTY フォールバック（既存 play-loop を再構成）
    └── formatter.ts              # 既存流用（line-view が使用）
```

既存の `game/play-loop.ts` は GameController + line-view に分解する。
`formatter.ts` / `input-parser.ts` は流用する。

## 8. 端末ライフサイクル（非交渉の前提）

- 起動（TTY）: blessed screen 生成で alt バッファ進入・カーソル制御。
- 必ず復元: `quit` / `SIGINT` / `SIGTERM` / `uncaughtException` のいずれでも `screen.destroy()` を
  通って端末を元に戻してから `exit` する。`main` を try/finally で囲み View を破棄する。
- リサイズ: `resize` で現在 ViewModel を再描画する。

## 9. テスト戦略

- **game-controller.spec.ts（中核）**: FakeEngine（`getVariables` 追加）で `apply()` を駆動し
  ViewModel 遷移を検証 — ナビのハイライト移動、confirm でのシーン前進、ended 遷移、
  `:get` / `:set` / 不正コマンドの message、quit フラグ、history 蓄積。
- **input-parser.spec.ts**: 維持。
- **line-view**: 既存の pipe ベース E2E を踏襲（同一コントローラを line View で駆動）。CI 実行可。
- **blessed-view**: 手動検証（構築が例外を投げないスモークのみ任意で追加）。

## 10. 依存追加

- `neo-blessed` + `@types/blessed`（devDep）を `pnpm-workspace.yaml` の catalog に追加する。
- neo-blessed は CJS のため ESM から default import で利用し、`node --experimental-transform-types`
  で動作する（JSX 不要）。

## 11. リスク / 留意点

- neo-blessed の保守状況・Windows 端末差異: Windows Terminal を前提とする。CJK 表示幅は blessed
  内部処理に依存し完璧ではない可能性があるが、デバッグツールとして許容する。崩れる場合は枠を簡素化する。
- `@types/blessed` と neo-blessed の API ドリフト: 乖離時は最小の ambient `d.ts` で補う。
- コマンドモードの文字単位 Action: blessed のキーイベントを `commandInput` / `commandBackspace` に
  翻訳する。line View は `runCommand(raw)` で一括処理し、1 つのコントローラに集約する。
