#!/usr/bin/env node
// =====================================================================
//  scan_ink.mjs — Ink シナリオの死蔵検出（到達不能 knot / 未使用 function /
//  未使用・書き込み専用 VAR）。削除は行わず「候補」を出すだけ。
//  使い方: node scan_ink.mjs path/to/scenario.ink
//
//  仕組み（コメントの誤検出を避けるため、まず // と /* */ を除去してから解析）:
//   - 到達不能 knot = 定義されているが `-> 名前` / `<- 名前` の的に一度も現れない
//     （関数・エントリ knot・DONE/END/START は除外）。
//   - 未使用 function = 定義されているが `名前(` の呼び出しが本体以外に無い。
//   - 未使用 VAR = 宣言のみ、または書き込み(`~ 名前 = …`)はあるが「読み」が 0。
//
//  ＊あくまで静的な候補。public_status（予約変数）やテスト/エンジンが
//    getVariable で外部参照する変数は read=0 でも消してはいけない。SKILL.md 参照。
// =====================================================================
import { readFileSync } from "node:fs";

const RESERVED_VARS = new Set(["public_status"]);
const BUILTIN_TARGETS = new Set(["DONE", "END", "START"]);

const file = process.argv[2];
if (!file) {
  console.error("usage: node scan_ink.mjs <file.ink>");
  process.exit(2);
}
const raw = readFileSync(file, "utf-8").replace(/^﻿/, "");
const rawLines = raw.split(/\r?\n/);

// --- コメント除去（行番号は保持）。// 行末コメントと /* */ ブロックを空白化 ---
const lines = [];
let inBlock = false;
for (const line of rawLines) {
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (inBlock) {
      const end = line.indexOf("*/", i);
      if (end === -1) { i = line.length; }
      else { inBlock = false; i = end + 2; }
      continue;
    }
    if (line[i] === "/" && line[i + 1] === "/") break; // 行末コメント
    if (line[i] === "/" && line[i + 1] === "*") { inBlock = true; i += 2; continue; }
    out += line[i];
    i += 1;
  }
  lines.push(out);
}
const code = lines.join("\n");

// --- knot / function 定義を収集 ---
const knots = [];      // { name, line, isFunction }
const knotDefRe = /^\s*===?\s*(function\s+)?([A-Za-z_]\w*)/;
lines.forEach((line, idx) => {
  const m = line.match(/^\s*===\s*(function\s+)?([A-Za-z_]\w*)/);
  if (m) knots.push({ name: m[2], line: idx + 1, isFunction: !!m[1] });
});
const funcNames = new Set(knots.filter((k) => k.isFunction).map((k) => k.name));
const knotNames = new Set(knots.filter((k) => !k.isFunction).map((k) => k.name));

// --- エントリ knot（最初の === より前にある -> X）---
let entry = null;
for (let i = 0; i < lines.length; i++) {
  if (/^\s*===/.test(lines[i])) break;
  const m = lines[i].match(/->\s*([A-Za-z_][\w.]*)/);
  if (m) { entry = m[1].split(".")[0]; }
}

// --- divert / thread の的を収集 ---
const targets = new Set();
for (const m of code.matchAll(/(?:->|<-)\s*([A-Za-z_][\w.]*)/g)) {
  targets.add(m[1].split(".")[0]);
}
if (entry) targets.add(entry);

// --- function 呼び出し回数 ---
const callCount = new Map([...funcNames].map((n) => [n, 0]));
for (const fn of funcNames) {
  const re = new RegExp(`\\b${fn}\\s*\\(`, "g");
  let total = 0;
  for (const _ of code.matchAll(re)) total++;
  // 定義行 `=== function fn(` の1件を差し引く
  callCount.set(fn, Math.max(0, total - 1));
}

// --- VAR 宣言と read/write の集計 ---
const vars = [];
lines.forEach((line, idx) => {
  const m = line.match(/^\s*(VAR|CONST|LIST)\s+([A-Za-z_]\w*)/);
  if (m) vars.push({ name: m[2], line: idx + 1, kind: m[1] });
});
function classifyVar(name) {
  const word = new RegExp(`\\b${name}\\b`, "g");
  let total = 0, decl = 0, writes = 0;
  lines.forEach((line) => {
    const occ = (line.match(word) || []).length;
    if (occ === 0) return;
    total += occ;
    if (/^\s*(VAR|CONST|LIST)\s+/.test(line) &&
        new RegExp(`^\\s*(VAR|CONST|LIST)\\s+${name}\\b`).test(line)) decl += occ;
    // 代入文 `~ name =`（複合代入含む）。RHS の同名は read として残す
    if (new RegExp(`~\\s*${name}\\s*(=|\\+=|-=|\\*=|/=)`).test(line)) writes += 1;
  });
  const reads = total - decl - writes;
  return { reads, writes };
}

// --- 判定 ---
const unreachable = knots
  .filter((k) => !k.isFunction && !targets.has(k.name) && k.name !== entry)
  .map((k) => `${k.name}  (${file}:${k.line})`);

const unusedFns = knots
  .filter((k) => k.isFunction && (callCount.get(k.name) || 0) === 0)
  .map((k) => `${k.name}  (${file}:${k.line})`);

const declOnly = [], writeOnly = [], reserved = [];
for (const v of vars) {
  if (RESERVED_VARS.has(v.name)) { reserved.push(`${v.name}  (${file}:${v.line})`); continue; }
  const { reads, writes } = classifyVar(v.name);
  if (reads > 0) continue;
  const tag = `${v.name}  (${file}:${v.line})`;
  if (writes > 0) writeOnly.push(tag); else declOnly.push(tag);
}

// --- 出力 ---
function section(title, items) {
  console.log(`\n## ${title} (${items.length})`);
  if (items.length === 0) console.log("  (なし)");
  else for (const it of items) console.log(`  - ${it}`);
}
console.log(`# ink dead-code scan: ${file}`);
console.log(`entry knot: ${entry ?? "(不明)"}`);
section("到達不能な knot", unreachable);
section("未使用の function", unusedFns);
section("未使用 VAR：宣言のみ（読みも書きも無い）", declOnly);
section("未使用 VAR：書き込み専用（読み 0・死蔵）", writeOnly);
section("予約変数（read=0 でも消さない・要外部確認）", reserved);
console.log(
  `\n注意: 書き込み専用/宣言のみでも、テストの getVariable や ` +
  `public_status 経由でエンジン/外部が読む場合がある。削除前に必ず ` +
  `リポジトリ全体を grep して外部参照が無いか確認すること。`
);

const total = unreachable.length + unusedFns.length + declOnly.length + writeOnly.length;
process.exit(total > 0 ? 1 : 0);
