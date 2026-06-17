import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Story } from "inkjs/engine/Story";
import { describe, expect, it } from "vitest";

// =====================================================================
//  全シナリオ横断の軽量・動的検証（Issue #12 / シナリオ非依存）
//  個別の解法テストを書かずに、どの .ink でも自動で次を検証する:
//   - 多数のランダム踏破で実行時エラー/ソフトロック
//     （"ran out of content" 等）が一切起きない
//   - 各局面で選択肢が枯渇する場合は必ず正規の終端（-> END/DONE）である
//
//  総当たり（状態爆発で重い）ではなく、決定論シードのランダム踏破で軽く回す。
//  「クリア到達可能か」までは保証しない（それは各 *.smoke.spec.ts が担う）。
//
//  ＊既定の `test` からは除外し、`pnpm --filter engine run test:scenarios` で実行する。
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, "../../../assets");

function loadJson(name: string): string {
  return readFileSync(resolve(assetsDir, name), "utf-8").replace(/^﻿/, "");
}

/** 決定論的な擬似乱数（mulberry32）。シードで再現可能にする。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface FuzzResult {
  errors: string[];
  reachedEnd: boolean;
  runs: number;
}

function fuzz(json: string, runs = 250, maxSteps = 150, seed = 0x12345): FuzzResult {
  const rng = mulberry32(seed);
  const errors: string[] = [];
  let reachedEnd = false;

  for (let r = 0; r < runs && errors.length === 0; r++) {
    const story = new Story(json);
    const path: string[] = [];
    try {
      for (let steps = 0; steps < maxSteps; steps++) {
        while (story.canContinue) {
          story.Continue();
        }
        const choices = story.currentChoices;
        if (choices.length === 0) {
          reachedEnd = true; // 正規の終端（-> END/DONE）
          break;
        }
        const i = Math.floor(rng() * choices.length);
        path.push(choices[i].text ?? "");
        story.ChooseChoiceIndex(i);
      }
    } catch (e) {
      errors.push(`run#${r} 経路[${path.join(" / ")}] で実行時エラー: ${(e as Error).message}`);
    }
  }
  return { errors, reachedEnd, runs };
}

const files = readdirSync(assetsDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

describe("全シナリオの軽量・動的検証（ランダム踏破）", () => {
  for (const file of files) {
    it(`${file}: ランダム踏破で実行時エラー/ソフトロックが起きない`, () => {
      const rep = fuzz(loadJson(file));
      expect(rep.errors, `\n${rep.errors.join("\n")}`).toEqual([]);
    });
  }
});
