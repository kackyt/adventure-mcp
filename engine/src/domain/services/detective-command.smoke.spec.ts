import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  detective_command.ink のスモークプレイ（Issue #12 / 探偵コマンドハーネス）
//  古典的な探偵アドベンチャーの固定コマンド体系で、推理を N択でなく
//  「証拠を相手に突きつける」行為で解くことを検証する。
//   - 固定コマンド（あたりをみる/しらべる/きく/なにかとる/ばしょいどう/もちもの/つきつける）
//   - 場所移動（広間↔水場）と部屋をまたぐ調査
//   - 決め手（水滴の筋）を入手し、カイに突きつけて解決→脱出
//   - 罠（弱い証拠／別人）はフェアに空振りし、進行不能にならない
//   位置: 1=広間, 2=水場
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../../../assets/detective_command.json");

function loadStoryJson(): string {
  return readFileSync(jsonPath, "utf-8").replace(/^﻿/, "");
}

interface Step {
  text: string;
  choices: { index: number; text: string }[];
}

function advance(engine: ScenarioEngine): Step {
  let text = "";
  while (engine.canContinue()) {
    text += engine.continue();
  }
  return { text, choices: engine.currentChoices };
}

function choose(engine: ScenarioEngine, label: string): Step {
  const choices = engine.currentChoices;
  expect(choices.length, `デッドエンド検出: 「${label}」`).toBeGreaterThan(0);
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

function examine(engine: ScenarioEngine, target: string): Step {
  choose(engine, "しらべる");
  return choose(engine, target);
}

/** 三つの証拠（足跡・泥・水滴の筋）を集め、水滴の筋を入手するまで進める。 */
function gatherDecisive(engine: ScenarioEngine): void {
  advance(engine);
  examine(engine, "台座"); // ev_footprint
  choose(engine, "ばしょいどう");
  choose(engine, "水場へ");
  examine(engine, "ぬかるみ"); // ev_mud
  choose(engine, "ばしょいどう");
  choose(engine, "広間へ");
  examine(engine, "広間の床"); // trail_seen
  choose(engine, "なにかとる"); // has_trail
}

describe("detective_command smoke play (#12 / 探偵コマンド)", () => {
  let engine: ScenarioEngine;

  beforeEach(() => {
    engine = new ScenarioEngine(loadStoryJson());
  });

  it("固定コマンドが揃い、解決コマンドは湧かない", () => {
    const start = advance(engine);
    for (const verb of [
      "あたりをみる",
      "しらべる",
      "きく",
      "なにかとる",
      "ばしょいどう",
      "もちものをみる",
      "つきつける",
    ]) {
      expect(
        start.choices.some((c) => c.text.includes(verb)),
        verb,
      ).toBe(true);
    }
  });

  it("決め手の水滴の筋をカイに突きつけると自白し、脱出できる", () => {
    gatherDecisive(engine);
    expect(engine.getVariable("has_trail")).toBe(true);

    choose(engine, "つきつける");
    choose(engine, "カイ");
    const solve = choose(engine, "水滴の筋の写し");
    expect(solve.text).toContain("なぜ濡れているんだ");
    expect(engine.getVariable("has_key")).toBe(true);

    const end = choose(engine, "出口の扉から去る");
    expect(end.text).toContain("事件を解いて");
    expect(engine.canContinue()).toBe(false);
  });

  it("罠: 濡れた足跡だけでは弱く、突きつけても空振り（進行可）", () => {
    advance(engine);
    examine(engine, "台座"); // ev_footprint のみ
    choose(engine, "つきつける");
    choose(engine, "カイ");
    // 決め手は未入手なので選べない
    expect(hasChoice(engine, "水滴の筋の写し")).toBe(false);
    const weak = choose(engine, "濡れた足跡の記録");
    expect(weak.text).toContain("空振り");
    expect(engine.getVariable("has_key")).toBe(false);
    expect(weak.choices.length).toBeGreaterThan(0);
  });

  it("決め手を別人（ボウ）に突きつけても空振りし、進行不能にならない", () => {
    gatherDecisive(engine);
    choose(engine, "つきつける");
    choose(engine, "ボウ");
    const wrong = choose(engine, "水滴の筋の写し");
    expect(wrong.text).toContain("足元へは続いていない");
    expect(engine.getVariable("has_key")).toBe(false);
    expect(wrong.choices.length).toBeGreaterThan(0);
  });

  it("ネタバレ防止: どの容疑者を選んでも同じ証拠メニューが出る（犯人が割れない）", () => {
    gatherDecisive(engine);
    // アレンを選んでも決め手「水滴の筋」を提示する選択肢が出る（カイ専用ではない）
    choose(engine, "つきつける");
    choose(engine, "アレン");
    expect(hasChoice(engine, "水滴の筋の写し")).toBe(true);
    choose(engine, "相手を選び直す");
    choose(engine, "ボウ");
    expect(hasChoice(engine, "水滴の筋の写し")).toBe(true);
  });

  it("水場では決め手の床調査はできない（場所依存）", () => {
    advance(engine);
    examine(engine, "台座");
    choose(engine, "ばしょいどう");
    choose(engine, "水場へ");
    examine(engine, "ぬかるみ");
    // 広間の床は水場では調べられない
    choose(engine, "しらべる");
    expect(hasChoice(engine, "広間の床")).toBe(false);
  });
});
