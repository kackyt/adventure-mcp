# GEMINI.md

## MANDATORY: Always Read MASTER.md First
プロジェクトのコアとなる仕様・ルール・最新状態は `docs/MASTER.md` に集約されています。
開発を開始する前に必ず `docs/MASTER.md` を確認してください。

## Project Overview
AIエディタ上で生成AIと対話しながら謎解きや探索を進めるアドベンチャーゲームを提供するMCPサーバーです。
シナリオの進行や状態管理は `Ink (inkle)` を用いて堅牢に行い、AIはプレイヤーとの対話（ゲームマスター役）に専念します。

## Architecture
本プロジェクトは `pnpm workspace` を用いたモノレポ構成です（cli, mcp-server, engine）。
- **エンジン (engine)**: ヘキサゴナルアーキテクチャ（Ports and Adapters）を採用し、ファイルI/Oとドメインロジック（InkJS）を分離しています。
- **デバッグ/実行環境**: `tsx` と `--experimental-strip-types` によるトランスパイルなしのモダンな実行環境を使用。

## Coding Standards
- **命名規則**:
  - クラス: `PascalCase` (例: `UserService`)
  - インターフェース: `PascalCase + I prefix` (例: `IUserRepository`)
  - メソッド・変数: `camelCase`
  - 定数: `UPPER_SNAKE_CASE`
  - ファイル名: `kebab-case`
- **原則**: マジックナンバーの禁止など、`docs/03-implementation/PATTERNS.md` に定義されたルールを遵守すること。

## Build Commands
ビルドステップは不要です。開発環境での即時実行には `tsx` または Node.js の `--experimental-strip-types` フラグを利用します。
パッケージ管理には `pnpm` を使用します。

## Development Workflow
Issue起票から着手し、ブランチ → 実装 → セルフレビュー → PR → マージの順で進めます。詳細は運用ドキュメントを参照してください。

## Information Verification Protocol
開発を進める上で要件や仕様に不明点・不足がある場合、以下のルールを遵守してください。

- **推論の禁止**: 不足している情報をAIが勝手に推論・自己判断して実装を進めないこと。
- **ユーザーへの確認**: 可能な選択肢やトレードオフを提示した上で、必ずユーザー(開発者)に判断を仰ぐこと。
- **前提条件の明示**: 確認や提案を行う際は、どのような前提や文脈に基づいているかを明示すること。
