#!/usr/bin/env node
// =====================================================================
//  gen_cipher_gimmick.mjs — 「帰納暗号ギミック」の機械生成器。
//  既知平文攻撃で規則を帰納させ、本命を1文字ずつ綴らせる封印パズルの
//  ①暗号文（既知ペア＋本命）②スロット別ダミー ③Ink スロット雛形
//  ④verify アサーション を、暗号方式を差し替え可能な形で生成する。
//
//  ＊人手で暗号を解かない（算術ミスの温床）。方式・鍵・平文だけ与え、
//    暗号文はここで計算する。方式は cipher_gimmick.md 参照。
//
//  使い方:
//    node gen_cipher_gimmick.mjs <config.json>
//    node gen_cipher_gimmick.mjs <config.json> --emit ink      # Ink だけ
//    node gen_cipher_gimmick.mjs <config.json> --emit verify   # verify だけ
//
//  対応方式（帰納型＝既知平文攻撃ファミリ）:
//    caesar | gronsfeld | vigenere | beaufort | keyword-substitution
// =====================================================================
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------
//  引数
// ---------------------------------------------------------------------
const args = process.argv.slice(2);
const cfgPath = args.find((a) => !a.startsWith("--"));
const emitIdx = args.indexOf("--emit");
const emit = emitIdx >= 0 ? args[emitIdx + 1] : "all"; // all | ink | verify
if (!cfgPath) {
  console.error("usage: node gen_cipher_gimmick.mjs <config.json> [--emit all|ink|verify]");
  process.exit(2);
}
const cfg = JSON.parse(readFileSync(cfgPath, "utf-8").replace(/^﻿/, ""));

// ---------------------------------------------------------------------
//  設定の既定値
// ---------------------------------------------------------------------
const method = (cfg.method || "gronsfeld").toLowerCase();
const SUPPORTED_METHODS = ["caesar", "gronsfeld", "vigenere", "beaufort", "keyword-substitution"];
if (!SUPPORTED_METHODS.includes(method)) {
  console.error(`未対応の暗号方式です: ${method}（対応: ${SUPPORTED_METHODS.join(", ")}）`);
  process.exit(2);
}
const alphabet = (cfg.alphabet || "ABCDEFGHIJKLMNOPQRSTUVWXYZ").toUpperCase();
const N = alphabet.length;
const idxOf = (ch) => alphabet.indexOf(ch);
const target = cfg.target; // { plaintext, key }
const knownPairs = cfg.knownPairs || []; // [{ plaintext, key }]
const distractorsPerSlot = cfg.distractorsPerSlot ?? 5;
const seed = cfg.seed ?? 1;
const prefix = cfg.knotPrefix || "pw";
const okVar = cfg.okVar || "cipher_ok";
const enterKnot = cfg.enterKnot || `${prefix}_enter`;
const resolveKnot = cfg.resolveKnot || "cipher_resolve";
const hubKnot = cfg.hubKnot || "hub";
const crackVar = cfg.crackVar || null;
const openLabel = cfg.openLabel || "封印を開く";
const successText = cfg.successText || "（開封の一節をここに置く）";
const failText = cfg.failText || "何も言わない";

if (!target || !target.plaintext || target.key === undefined) {
  console.error("config.target.{plaintext,key} は必須です");
  process.exit(2);
}
const PT = target.plaintext.toUpperCase();
for (const ch of PT) {
  if (idxOf(ch) < 0) { console.error(`平文の文字 "${ch}" が alphabet にありません`); process.exit(2); }
}

// ---------------------------------------------------------------------
//  暗号方式（帰納型ファミリ）
// ---------------------------------------------------------------------
//  シフト系（caesar/gronsfeld/vigenere/beaufort）は「位置ごとのシフト量
//  keyStream」と「結合則 combine」に分解できる。keyword-substitution だけ
//  固定置換表。
function keyStream(m, key, length) {
  const s = [];
  if (m === "caesar") {
    const raw = parseInt(String(key), 10);
    if (isNaN(raw)) { console.error(`caesar方式の鍵は数値である必要があります: ${key}`); process.exit(2); }
    const shift = ((raw % N) + N) % N;
    for (let i = 0; i < length; i++) s.push(shift);
  } else if (m === "gronsfeld") {
    const digits = String(key).split("").map((d) => parseInt(d, 10));
    if (digits.some(isNaN)) { console.error(`gronsfeld方式の鍵は各桁が数値である必要があります: ${key}`); process.exit(2); }
    for (let i = 0; i < length; i++) s.push(((digits[i % digits.length] % N) + N) % N);
  } else if (m === "vigenere" || m === "beaufort") {
    const kc = String(key).toUpperCase().split("");
    for (let i = 0; i < length; i++) {
      const ki = idxOf(kc[i % kc.length]);
      if (ki < 0) { console.error(`鍵の文字 "${kc[i % kc.length]}" が alphabet にありません`); process.exit(2); }
      s.push(ki);
    }
  }
  return s;
}
function combine(m, p, k) {
  if (m === "beaufort") return ((k - p) % N + N) % N;
  return (p + k) % N; // caesar/gronsfeld/vigenere = 加算
}
function keyedAlphabet(keyword) {
  const seen = new Set();
  let out = "";
  for (const ch of String(keyword).toUpperCase()) {
    if (alphabet.includes(ch) && !seen.has(ch)) { out += ch; seen.add(ch); }
  }
  for (const ch of alphabet) if (!seen.has(ch)) { out += ch; seen.add(ch); }
  return out;
}
function encrypt(m, plaintext, key) {
  const pt = plaintext.toUpperCase();
  if (m === "keyword-substitution") {
    const ka = keyedAlphabet(key);
    return pt.split("").map((ch) => ka[idxOf(ch)]).join("");
  }
  const stream = keyStream(m, key, pt.length);
  return pt.split("").map((ch, i) => alphabet[combine(m, idxOf(ch), stream[i])]).join("");
}

// ---------------------------------------------------------------------
//  計算：既知ペアと本命の暗号文
// ---------------------------------------------------------------------
const pairsOut = knownPairs.map((p) => ({
  plaintext: p.plaintext.toUpperCase(),
  key: p.key,
  cipher: encrypt(method, p.plaintext, p.key),
  label: p.label || "",
}));
const targetCipher = encrypt(method, PT, target.key);

// ---------------------------------------------------------------------
//  フェアネス点検：手がかりだけで規則が一意に帰納できるか
// ---------------------------------------------------------------------
//  シフト系：既知ペア（平文・鍵・＝計算した暗号文）を、よくある取り違え
//  仮説でも再現できてしまわないか。複数仮説が全ペアを満たす＝手がかり不足
//  （プレイヤーが誤った規則を帰納しても全手がかりに合致し、本命で外す）。
//  keyword-substitution：本命の各文字が既知ペアのどこかに現れるか（被覆）。
function fairnessReport() {
  const lines = [];
  if (method === "keyword-substitution") {
    const covered = new Set(pairsOut.flatMap((p) => p.plaintext.split("")));
    const missing = [...new Set(PT.split(""))].filter((ch) => !covered.has(ch));
    if (missing.length === 0) {
      lines.push("OK: 本命の全文字が既知ペアに現れる（置換表を復元できる）");
    } else {
      lines.push(`WARN: 本命の文字 ${missing.join(",")} が既知ペアに無い＝復元不能。`);
      lines.push("      → その文字を含む既知ペアを1つ足すこと。");
    }
    return lines;
  }
  // シフト系：取り違え仮説の網（証明ではなく頻出の取り違えの検査）
  //  結合則（combine）だけを揺らして、既知ペアを他仮説でも再現できないか見る。
  //  keyStream（鍵の桁/文字の解釈）は宣言方式のもので固定。beaufort 宣言時も
  //  鍵の解釈は vigenere 同様の「文字→indexシフト」なので keyStream は共通。
  const streamMethod = method === "beaufort" ? "vigenere" : method;
  const declared = method === "beaufort" ? "beaufort" : "add";
  const hypos = {
    add: (p, k) => (p + k) % N,
    sub: (p, k) => ((p - k) % N + N) % N,
    beaufort: (p, k) => ((k - p) % N + N) % N,
    "add+1": (p, k) => (p + k + 1) % N,
    "add-1": (p, k) => ((p + k - 1) % N + N) % N,
  };
  if (pairsOut.length === 0) {
    lines.push("WARN: knownPairs が空。既知平文が無いと帰納の足場が無い。");
    return lines;
  }
  const survivors = Object.keys(hypos).filter((h) =>
    pairsOut.every((p) => {
      const stream = keyStream(streamMethod, p.key, p.plaintext.length);
      return p.plaintext.split("").every((ch, i) => alphabet[hypos[h](idxOf(ch), stream[i])] === p.cipher[i]);
    })
  );
  if (survivors.length === 1 && survivors[0] === declared) {
    lines.push(`OK: 既知ペアが規則を一意に決める（他の取り違え仮説は棄却: ${Object.keys(hypos).filter((h) => h !== declared).join(", ")}）`);
  } else {
    lines.push(`WARN: 既知ペアだけでは規則が一意に決まらない。両立する仮説: ${survivors.join(", ")}`);
    lines.push("      → 鍵の桁/文字に 0（無シフト）や大きな値を混ぜ、ペアを1つ足して曖昧さを潰す。");
  }
  return lines;
}

// ---------------------------------------------------------------------
//  スロット別ダミー（seed 決定論）
// ---------------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(seed);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// 各スロット：正解＋ダミー（正解以外の文字から seed で選ぶ）
const slots = targetCipher.split("").map((correct) => {
  const pool = alphabet.split("").filter((c) => c !== correct);
  const picks = shuffle(pool).slice(0, Math.min(distractorsPerSlot, pool.length));
  return { correct, options: shuffle([correct, ...picks]) };
});

// ---------------------------------------------------------------------
//  Ink 雛形
// ---------------------------------------------------------------------
function inkBlock() {
  const L = [];
  L.push(`// ── 自動生成: 暗号スロット（方式=${method} / 平文 ${PT} / 鍵 ${target.key} → 暗号名 ${targetCipher}） ──`);
  L.push(`// 再生成: node .../gen_cipher_gimmick.mjs <config>. 手で数式は解かない。`);
  L.push(`// TODO(作者): 各スロットの問い文と resolve の描写を書く。解法（方式）は本文・手帳に書かない。`);
  L.push("");
  L.push(`=== ${enterKnot} ===`);
  L.push(`// TODO: 端末/錠前の前に立つ導入描写`);
  L.push(`~ ${okVar} = true`);
  L.push(`-> ${prefix}_s1`);
  L.push("");
  slots.forEach((slot, i) => {
    const n = i + 1;
    const next = n < slots.length ? `${prefix}_s${n + 1}` : resolveKnot;
    L.push(`=== ${prefix}_s${n} ===`);
    L.push(`// TODO: 「${n}文字目は？」等の問い（答えを明かさない）`);
    for (const opt of slot.options) {
      const dest = opt === slot.correct ? next : `${prefix}_s${n}w`;
      L.push(`+ [${opt}] -> ${dest}`);
    }
    L.push(`= ${prefix}_s${n}w`);
    L.push(`~ ${okVar} = false`);
    L.push(`-> ${next}`);
    L.push("");
  });
  L.push(`=== ${resolveKnot} ===`);
  L.push(`{ ${okVar}:`);
  L.push(`    // TODO: 開封の描写。${successText}`);
  if (crackVar) L.push(`    ~ ${crackVar} = true`);
  L.push(`- else:`);
  L.push(`    // TODO: 無音の失敗描写（再挑戦可）。端末は「${failText}」`);
  L.push(`}`);
  L.push(`-> ${hubKnot}`);
  return L.join("\n");
}

// ---------------------------------------------------------------------
//  verify アサーション
// ---------------------------------------------------------------------
function verifyBlock() {
  const L = [];
  const picks = (s) => s.split("").map((c) => `pick("${c}");`).join(" ");
  // 末尾1文字違いの near-miss（最後のスロットのダミー先頭）
  const lastSlot = slots[slots.length - 1];
  const wrongLast = lastSlot.options.find((o) => o !== lastSlot.correct);
  const nearMiss = targetCipher.slice(0, -1) + wrongLast;
  L.push(`// ── 暗号封印の検証（誤り→無音失敗 / 正解→開封 の2ルートを必ず踏む）──`);
  L.push(`// 誤入力（末尾1文字違い ${targetCipher} → ${nearMiss}）は無音で失敗`);
  L.push(`pick("しらべる"); pick("${openLabel}");`);
  L.push(picks(nearMiss));
  L.push(`assertText("${failText}", "誤った暗号名は無音で失敗");`);
  L.push(`// 正しい暗号名 ${targetCipher} で開封`);
  L.push(`pick("しらべる"); pick("${openLabel}");`);
  L.push(picks(targetCipher));
  L.push(`assertText("${successText}", "暗号を解いて開封");`);
  return L.join("\n");
}

// ---------------------------------------------------------------------
//  出力
// ---------------------------------------------------------------------
if (emit === "all") {
  console.log(`# 暗号ギミック生成: 方式=${method} / alphabet(${N})`);
  console.log(`\n## 暗号文（作者が手がかりとして本文に配置する値）`);
  console.log(`  本命: ${PT}  (鍵 ${target.key})  →  ${targetCipher}`);
  for (const p of pairsOut) {
    console.log(`  既知: ${p.plaintext}  (鍵 ${p.key})  →  ${p.cipher}${p.label ? `   ${p.label}` : ""}`);
  }
  console.log(`\n## フェアネス点検（手がかりから規則が一意に帰納できるか）`);
  for (const l of fairnessReport()) console.log(`  ${l}`);
  console.log(`\n## Ink（engine/assets/… の該当章に貼り、TODO を埋める）\n`);
  console.log(inkBlock());
  console.log(`\n## verify（engine/scripts/verify-*.ts に貼る）\n`);
  console.log(verifyBlock());
} else if (emit === "ink") {
  console.log(inkBlock());
} else if (emit === "verify") {
  console.log(verifyBlock());
} else {
  console.error(`unknown --emit ${emit}`);
  process.exit(2);
}
