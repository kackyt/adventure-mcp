import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  frozen_key.ink のスモークプレイ（Issue #12）
//  build:ink が生成した JSON を inkjs で実際に再生し、
//   - 正解ルートでクリア到達
//   - 失敗ルート（松明のみ）では氷が溶けず「鍵を取る」が出現しない
//   - 一度きりイベント（棚/油壺）が再訪で再発しない
//   - 各局面に必ず選択肢があり、デッドエンド（ソフトロック）にならない
//  を検証する。
//
//  ＊生成 JSON 先頭には BOM が付くため、Story へ渡す前に除去する。
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/frozen_key.json");

function loadStoryJson(): string {
  return readFileSync(jsonPath, "utf-8").replace(/^﻿/, "");
}

interface Step {
  text: string;
  choices: { index: number; text: string }[];
}

/** canContinue の間テキストを読み進め、現在の選択肢とともに返す。 */
function advance(engine: ScenarioEngine): Step {
  let text = "";
  while (engine.canContinue()) {
    text += engine.continue();
  }
  return { text, choices: engine.currentChoices };
}

/** 部分一致でラベルを探して選択肢を選ぶ。デッドエンド検出を兼ねる。 */
function choose(engine: ScenarioEngine, label: string): Step {
  const choices = engine.currentChoices;
  expect(
    choices.length,
    `デッドエンド検出: 選択肢がない状態で「${label}」を選ぼうとした`,
  ).toBeGreaterThan(0);
  const target = choices.find((c) => c.text.includes(label));
  if (!target) {
    throw new Error(
      `選択肢「${label}」が見つからない。候補: [${choices.map((c) => c.text).join(", ")}]`,
    );
  }
  engine.chooseChoiceIndex(target.index);
  return advance(engine);
}

function hasChoice(engine: ScenarioEngine, label: string): boolean {
  return engine.currentChoices.some((c) => c.text.includes(label));
}

describe("frozen_key smoke play (#12)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("正解ルート: 松明と油を集めて順序どおりに使えばクリアに到達する", () => {
    advance(engine); // 前室の導入

    choose(engine, "棚を調べる"); // 松明入手
    expect(engine.getVariable("has_torch")).toBe(true);

    choose(engine, "奥の祭室へ進む");
    choose(engine, "祭壇の脇を調べる"); // 油入手
    expect(engine.getVariable("has_oil")).toBe(true);

    // 非自明な順序: 油 → 点火
    choose(engine, "氷に油をかける");
    expect(engine.getVariable("oil_applied")).toBe(true);

    choose(engine, "松明をかざす");
    expect(engine.getVariable("ice_melted")).toBe(true);

    choose(engine, "現れた鍵を取る");
    expect(engine.getVariable("has_key")).toBe(true);

    choose(engine, "前室へ戻る");
    const end = choose(engine, "鉄の出口扉を開ける");

    // クリア到達: テキストに脱出が現れ、選択肢が尽きて物語が終端する
    expect(end.text).toContain("脱出した");
    expect(engine.canContinue()).toBe(false);
    expect(engine.currentChoices.length).toBe(0);
  });

  it("失敗ルート（フェア）: 松明だけでは氷は溶けず、鍵を取る選択肢は出現しない", () => {
    advance(engine);
    choose(engine, "棚を調べる"); // 松明のみ。油は取らない
    choose(engine, "奥の祭室へ進む");
    const step = choose(engine, "松明をかざす"); // 油なしで点火

    expect(step.text).toContain("もっと強い火");
    expect(engine.getVariable("ice_melted")).toBe(false);
    // (C) 手がかりゲート: 答えの選択肢はメニューに出ない
    expect(hasChoice(engine, "鍵を取る")).toBe(false);
    // デッドエンドではない: 油を取り直して挽回できる
    expect(hasChoice(engine, "祭壇の脇を調べる")).toBe(true);
  });

  it("素手で割る失敗を繰り返しても進行不能にならない（デッドエンド回避）", () => {
    advance(engine);
    choose(engine, "奥の祭室へ進む");
    for (let i = 0; i < 3; i++) {
      const step = choose(engine, "氷を素手で割ろうとする");
      expect(step.choices.length).toBeGreaterThan(0); // 常に選択肢が残る
    }
    expect(engine.getVariable("ice_melted")).toBe(false);
  });

  it("一度きりイベント: 棚と油壺は再訪しても再発・重複取得しない", () => {
    advance(engine);
    choose(engine, "棚を調べる");
    const second = choose(engine, "棚を調べる");
    expect(second.text).toContain("残っていない");
    expect(engine.getVariable("has_torch")).toBe(true); // 重複しても true のまま

    choose(engine, "奥の祭室へ進む");
    choose(engine, "祭壇の脇を調べる");
    const sideAgain = choose(engine, "祭壇の脇を調べる");
    expect(sideAgain.text).toContain("残っていない");
    expect(engine.getVariable("has_oil")).toBe(true);
  });
});
