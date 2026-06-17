import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

// =====================================================================
//  サウンドノベル（分岐物語）ハーネスのスモークプレイ（Issue #12）
//   - sound_novel  : 標準型（多重ED＋フラグ分岐＋全EDで真ルート解禁）
//   - zapping_novel: ザッピング型（複数視点・進行がキャラ間を渡る相互依存）
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const assets = resolve(__dirname, "../../../assets");

function load(name: string): string {
  return readFileSync(resolve(assets, name), "utf-8").replace(/^﻿/, "");
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

describe("サウンドノベル標準型 (sound_novel)", () => {
  let engine: ScenarioEngine;
  beforeEach(() => {
    engine = new ScenarioEngine(load("sound_novel.json"));
  });

  it("確かめに行き抱き起こすと GOOD END になる", () => {
    advance(engine);
    choose(engine, "物語を始める");
    choose(engine, "確かめに行く");
    const r = choose(engine, "抱き起こす");
    expect(r.text).toContain("GOOD END");
    expect(engine.getVariable("seen_good")).toBe(true);
  });

  it("閉じこもると BAD END になる", () => {
    advance(engine);
    choose(engine, "物語を始める");
    const r = choose(engine, "朝を待つ");
    expect(r.text).toContain("BAD END");
    expect(engine.getVariable("seen_bad")).toBe(true);
  });

  it("GOOD と BAD を両方見るまで真ルートは出ない／両方見ると TRUE END に到達する", () => {
    advance(engine);
    // 1周目: BAD
    choose(engine, "物語を始める");
    choose(engine, "朝を待つ");
    let title = choose(engine, "タイトルに戻る");
    expect(title.choices.some((c) => c.text.includes("隠された真実"))).toBe(false); // まだ

    // 2周目: GOOD
    choose(engine, "もう一度、あの夜へ");
    choose(engine, "確かめに行く");
    choose(engine, "抱き起こす");
    title = choose(engine, "タイトルに戻る");
    expect(title.choices.some((c) => c.text.includes("隠された真実"))).toBe(true); // 解禁

    const end = choose(engine, "隠された真実をたどる");
    expect(end.text).toContain("TRUE END");
    expect(engine.canContinue()).toBe(false);
  });
});

describe("ザッピング型 (zapping_novel)", () => {
  let engine: ScenarioEngine;
  beforeEach(() => {
    engine = new ScenarioEngine(load("zapping_novel.json"));
  });

  it("時刻ハンドオフで主人公を渡り歩き、誰も BADEND にせず通すとクリアする", () => {
    const start = advance(engine);
    expect(start.text).toContain("刑事サトル ／ 10:00"); // 最初の主人公の時刻シーン
    const toTome = choose(engine, "穏便に間に入って諭す");
    expect(toTome.text).toContain("ZAPPING"); // トメ編へハンドオフ
    expect(toTome.text).toContain("トメ ／ 10:30");
    const toMio = choose(engine, "丁寧に説明する");
    expect(toMio.text).toContain("ミオ ／ 11:00");
    const toSato = choose(engine, "大通りを行く");
    expect(toSato.text).toContain("1日目クリア");
    expect(engine.canContinue()).toBe(false);
  });

  it("連動: サトルの選択がトメ編を BADEND にする（別主人公の結末）", () => {
    advance(engine);
    const bad = choose(engine, "力ずくで取り押さえる");
    expect(bad.text).toContain("BADEND・トメ編");
    // BADEND はやり直し可（ソフトロックでない）
    expect(hasChoice(engine, "初めからやり直す")).toBe(true);
    expect(hasChoice(engine, "受け入れて終える")).toBe(true);
  });

  it("連動: ミオの選択がサトル編を BADEND にする", () => {
    advance(engine);
    choose(engine, "穏便に間に入って諭す"); // → トメ
    choose(engine, "丁寧に説明する"); // → ミオ
    const bad = choose(engine, "人気のない路地を抜ける");
    expect(bad.text).toContain("BADEND・サトル編");
    expect(hasChoice(engine, "初めからやり直す")).toBe(true);
  });
});
