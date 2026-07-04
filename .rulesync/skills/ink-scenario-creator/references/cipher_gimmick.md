# 帰納暗号ギミック（既知平文攻撃 → 本命を綴らせる封印）

古典暗号を**方式非依存**で「謎」に仕立てる再利用パターン。特定の暗号（グロンスフェルト等）に固定しない。
既知の手がかりから暗号規則を**帰納**させ、本命を**1文字ずつ綴らせて**封印を開く。実装の数式は
[scripts/gen_cipher_gimmick.mjs](../scripts/gen_cipher_gimmick.mjs) が計算する（**人手で暗号を解かない**＝算術ミスの温床）。

> 位置づけ：これは `puzzle_design.md` §6.1「帰納」の暗号版の具体レシピ。難易度・フェアネスの一般則は
> `puzzle_design.md`／`PUZZLE_DESIGN.md` §6 に従う。本書は Ink 実装と機械生成に落とす手引き。

## 1. 骨格（3本柱）

1. **規則の帰納（既知平文攻撃）** — 平文↔暗号文の既知ペア（or 鍵表）を diegetic な手がかりとして**分散配置**。
   方式そのものは**本文・手帳に書かない**。プレイヤーが試行・観察でシフト規則/置換表を組み立てる。
2. **本番の一手入力** — 各文字スロットを `+ [X]` 選択にし、**正解1＋ダミー数個**。規則を帰納できていないと
   各スロットで詰まる（`choice-and-puzzle-prefs` の「本番の一手」型）。`_ok` フラグは true 開始で、
   誤選択のたびに false 化し、resolve で判定。
3. **フェアな失敗** — 誤りは**無音で失敗**し、封印は閉じたまま。デッドエンドにせず**再挑戦可**。

### 帰納を犯人証明の決め手にしない

暗号封印は**来歴・鍵の在り処を開く lore ゲート**に使う（例：machida の `m2_crack`＝オリオン計画の名が初出）。
**帰納の成否が真犯人の断定に直結しないこと**（`choice-and-puzzle-prefs`）。取りこぼしても別経路で進行できる設計に。

## 2. フェアネス・ルーブリック（設計時に潰す）

| 項目 | 要件 | 実装での担保 |
| --- | --- | --- |
| **ノンスポイラー** | スロットの選択肢ラベルが答えを名指ししない（ただの文字が並ぶだけ） | `+ [U]` 等、文字のみ。正解に印を付けない |
| **規則の一意帰納** | 既知ペアだけで規則が一意に決まる（誤った規則を帰納しても全手がかりに合致…を防ぐ） | 生成器のフェアネス点検（§4）。シフト系＝取り違え仮説の棄却／換字＝本命全文字の被覆 |
| **鍵は世界に見えている** | 本命の鍵（通し番号等）は diegetic に露出（規則を当てれば綴れる） | machida：ファイル番号 `No.205` が一覧に見える |
| **方式を書かない** | 手帳・本文に「ずらす」「対応表」等の解法を書かない | verify で `assertNotText("ずらし", …)` 等の回帰ガード |
| **選択肢をフラグで消さない** | 入口（開封メニュー）の**出現条件**は手がかり収集（前提）で、正解入力の途中は消さない | 開封メニューは既知ペア収集後に `{cond}` で出す。スロット内 `+` は常時 |
| **無音の再挑戦** | 誤入力はソフトロックせず、何度でも試せる | resolve の else 節で失敗描写→hub へ戻す |
| **2ルートの機械検証** | 誤り（無音失敗・lore 出さず）と正解（開封）の両方を verify で踏む | 生成器の verify ブロック（§4） |

> **暗号文は手がかりとして本文に「表示」される**。`#` タグ等に食われて画面から消えていないか、
> verify で `assertText("UIVJIABO", …)` のように確認する（machida の回帰ガード参照）。

## 3. Ink 実装パターン

`cipher_enter` で `_ok=true`→最初のスロットへ。各スロット `pw_sN` は正解→次スロット、誤り→gather
`= pw_sNw` で `_ok=false` にして次へ（**誤っても綴りは最後まで進み、失敗は末尾で無音**）。最終スロット正解→
`cipher_resolve` で `_ok` を判定。

```ink
=== cipher_enter ===
~ cipher_ok = true
-> pw_s1

=== pw_s1 ===
// 「一文字目は？」——解法は書かない
+ [A] -> pw_s1w
+ [U] -> pw_s2      // 正解だけが次へ。印は付けない
+ [B] -> pw_s1w
= pw_s1w
~ cipher_ok = false
-> pw_s2
// …s2..sN 同型。最終スロットの正解は -> cipher_resolve

=== cipher_resolve ===
{ cipher_ok:
    // 開封の描写（ここで初めて明かす来歴など）
    ~ some_crack = true
- else:
    // 無音の失敗（端末は何も言わない）。再挑戦可
}
-> some_hub
```

- 開封メニューは**既知ペアを集めるまで出さない**（`puzzle_design.md` (C) 手がかりゲート）:
  `+ {vault && pair1 && pair2 && pair3 && not cracked} [『総括』を開く] -> cipher_enter`
- スロットのダミーは**意味のある紛らわしさ**を狙わなくてよいが、正解が一目で浮かないよう散らす（生成器が seed で散らす）。

## 4. 機械生成器（数式は人手で解かない）

```
node .rulesync/skills/ink-scenario-creator/scripts/gen_cipher_gimmick.mjs <config.json>
node .rulesync/skills/ink-scenario-creator/scripts/gen_cipher_gimmick.mjs <config.json> --emit ink
node .rulesync/skills/ink-scenario-creator/scripts/gen_cipher_gimmick.mjs <config.json> --emit verify
```

方式・鍵・平文だけ与えれば、**①既知ペア＋本命の暗号文 ②フェアネス点検 ③Ink スロット雛形 ④verify アサーション**
を出力する。対応方式（帰納型＝既知平文攻撃ファミリ）：`caesar` / `gronsfeld` / `vigenere` / `beaufort` /
`keyword-substitution`。

### config スキーマ

```jsonc
{
  "method": "gronsfeld",              // 上記5方式
  "alphabet": "ABC…XYZ",              // 省略時 A–Z（26）
  "target":   { "plaintext": "SOUKATSU", "key": "205" },   // 本命（鍵は世界に見せる値）
  "knownPairs": [                     // 既知平文（暗号文は生成器が計算・手打ちしない）
    { "plaintext": "GIJIROKU", "key": "017", "label": "議事録 No.017" },
    { "plaintext": "OBOEGAKI", "key": "042", "label": "覚書 No.042" },
    { "plaintext": "RINGISYO", "key": "308", "label": "稟議書 No.308" }
  ],
  "distractorsPerSlot": 5,            // スロット毎のダミー数（既定5）
  "seed": 205,                        // ダミー配置の決定論シード
  "knotPrefix": "pw", "okVar": "m2_pw_ok",
  "enterKnot": "cipher_enter", "resolveKnot": "cipher_resolve", "hubKnot": "ch2_hub",
  "crackVar": "m2_crack",             // 開封で立てる進行フラグ（任意）
  "openLabel": "『総括』を開く",       // 開封メニューのラベル（verify で使う）
  "successText": "オリオン計画", "failText": "何も言わない"   // verify の assert 文字列
}
```

### フェアネス点検が出すもの

- **シフト系**（caesar/gronsfeld/vigenere/beaufort）＝既知ペアを、よくある取り違え仮説（加算/減算/beaufort/
  ±1シフト）でも再現できてしまわないか。複数仮説が両立＝**手がかり不足**（誤った規則を帰納しても手がかりに
  合致し本命で外す）。→ 鍵に `0`（無シフト）や大きな値を混ぜ、ペアを1つ足して曖昧さを潰す。
- **keyword-substitution**＝本命の**各文字が既知ペアのどこかに現れるか**（置換表の被覆）。欠けた文字は復元不能
  →その文字を含むペアを足す。

> 点検は**証明ではなく頻出の取り違えの網**。最終的なフェアさ・可解性は §5 のスモークプレイと、必要なら
> コールドプレイ（解を見ない別エージェント）で担保する。

## 5. 検証（必須・2ルート）

生成器の verify ブロックを `engine/scripts/verify-*.ts`（または該当 spec）に貼り、**誤り→無音失敗（lore を出さない）**
と**正解→開封**の両方を実際に inkjs で踏む。あわせて：

- 暗号文が本文に**表示**される（`#` タグ食い回帰）：`assertText("UIVJIABO", …)`
- 手帳が解法を**明かさない**：`assertNotText("ずらし", …)` 等
- 開封メニューが**既知ペア収集前に出ない**：`assertNoChoice("『総括』を開く", …)`

（machida の実装・検証は [engine/scripts/verify-machida.ts](../../../../../engine/scripts/verify-machida.ts) の第2章節が実例。）

## 6. 別方式への拡張

シフト系4方式は「位置ごとのシフト量 `keyStream` × 結合則 `combine`」に分解して1つの実装で賄っている
（`caesar`=定数／`gronsfeld`=鍵の各桁／`vigenere`=鍵文字の index／`beaufort`=`key−plain`）。
**転置式・鍵表/コードブック型（`cipher_levers.ink` の記号→対応表）や、範囲外の独自方式**を使いたい場合は、
生成器の `encrypt()` に方式を1つ足す（`keyStream`+`combine` で表せるなら数行）か、換字系と同様に固定表を
返す実装を書く。骨格（§3 の Ink スロット機・§2 のフェアネス・§5 の2ルート検証）は**方式非依存で不変**。

> **暗号の選択は「世界の理」から**（`puzzle_design.md` §6.2）。事務規約・バンドの曲順・元素記号…と、
> その世界に既にある符牒へ方式を一致させる。恣意的な暗号をゲーム都合で置かない。
