import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ScenarioEngine } from "../domain/services/scenario-engine.ts";

// =====================================================================
//  star_marrow_mine.ink（サバイバル・RPG worked example）のスモークプレイ。
//  コンパイル済み JSON を inkjs で実再生し、survival_rpg_gimmicks.md §9 の
//  検証項目（前提ゲート・勝敗フラグ・再訪・終端ED・ソフトロック無し）を機械検証する。
//  シナリオは完全決定論（RANDOM 不使用）なので、スクリプトプレイは常に同じ結果になる。
// =====================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORY_JSON = readFileSync(
  resolve(__dirname, "../../assets/star_marrow_mine.json"),
  "utf-8",
).replace(/^﻿/, "");

function newGame(): ScenarioEngine {
  const engine = new ScenarioEngine(STORY_JSON);
  playOut(engine);
  return engine;
}

/** 選択肢が出るか終端に達するまで本文を読み進め、読んだ本文を返す。 */
function playOut(engine: ScenarioEngine): string {
  let text = "";
  while (engine.canContinue()) {
    text += engine.continue();
  }
  return text;
}

/** パターンに一致する選択肢を選び、続く本文を返す。無ければ現在の選択肢一覧つきで失敗。 */
function choose(engine: ScenarioEngine, pattern: RegExp): string {
  const found = engine.currentChoices.find((c) => pattern.test(c.text));
  if (!found) {
    const labels = engine.currentChoices.map((c) => c.text).join(" / ");
    throw new Error(`選択肢 ${pattern} が見つからない。現在: ${labels}`);
  }
  engine.chooseChoiceIndex(found.index);
  return playOut(engine);
}

function hasChoice(engine: ScenarioEngine, pattern: RegExp): boolean {
  return engine.currentChoices.some((c) => pattern.test(c.text));
}

function isTerminal(engine: ScenarioEngine): boolean {
  return !engine.canContinue() && engine.currentChoices.length === 0;
}

/** 「得物を振るう」を選び続けて戦闘を終える（勝利で抜ける・敗北で終端・上限で失敗）。 */
function fightWithWeapon(engine: ScenarioEngine): string {
  let text = "";
  for (let i = 0; i < 30; i++) {
    if (!hasChoice(engine, /得物を振るう/)) {
      return text;
    }
    text += choose(engine, /得物を振るう/);
  }
  throw new Error("戦闘が30ラウンドで終わらない（決定論が壊れている）");
}

/** クリアの最短筋: 大鼠→短剣→迂回路→坑夫灯→蜘蛛→鶴嘴→岩盤→護符→泉→星喰らい。 */
function playToBossRoom(engine: ScenarioEngine, opts: { takeCharm: boolean }): void {
  fightWithWeapon(engine); // 大鼠（素手で勝てる）
  choose(engine, /錆びた短剣/);
  choose(engine, /薬草を摘み取る/);
  choose(engine, /下り梯子で地下二階へ/);
  choose(engine, /銀の坑夫灯/);
  choose(engine, /薬箱から薬草/);
  choose(engine, /地下三階への坑道/);
  choose(engine, /迂回路をゆく/);
  fightWithWeapon(engine); // 闇綴りの蜘蛛（坑夫灯あり）
  choose(engine, /鋼の鶴嘴/);
  choose(engine, /岩盤を砕く/);
  choose(engine, /裂け目を抜けて地下四階へ/);
  if (opts.takeCharm) {
    choose(engine, /欠月の護符/);
  }
  choose(engine, /泉の水を浴びる/);
  choose(engine, /地下五階へ降りる/);
}

describe("star_marrow_mine スモークプレイ", () => {
  it("クリアに到達できる（前提装備ありでは勝てる）", () => {
    const engine = newGame();
    playToBossRoom(engine, { takeCharm: true });
    choose(engine, /星喰らいに挑む/);
    fightWithWeapon(engine);
    expect(engine.getVariable("boss_beaten")).toBe(true);
    const endingText = choose(engine, /星髄を穿ち取る/);
    expect(endingText).toContain("村への道を歩き出した");
    expect(isTerminal(engine)).toBe(true);
  });

  it("public_status は公開ステータスのみ（勝敗フラグ・public_status 自体は出ない）", () => {
    const engine = newGame();
    const status = engine.getPublicVariables();
    expect(Object.keys(status).sort()).toEqual([
      "conditions",
      "depth",
      "equipment",
      "herb_count",
      "player_hp",
    ]);
    expect(status.player_hp).toBe(20);
    // LIST は文字列に正規化される（開始時は装備なし＝空文字列）
    expect(status.equipment).toBe("");
    expect(status.conditions).toBe("");
  });

  it("装備 LIST が ', ' 区切り文字列として公開される", () => {
    const engine = newGame();
    fightWithWeapon(engine);
    choose(engine, /錆びた短剣/);
    expect(engine.getPublicVariables().equipment).toBe("rusty_dagger");
    choose(engine, /下り梯子で地下二階へ/);
    choose(engine, /銀の坑夫灯/);
    expect(engine.getPublicVariables().equipment).toBe("rusty_dagger, miners_lamp");
  });

  it("前提ゲート: 坑夫灯なしでは蜘蛛に勝てず、敗北は終端ED", () => {
    const engine = newGame();
    fightWithWeapon(engine); // 大鼠
    choose(engine, /錆びた短剣/);
    choose(engine, /下り梯子で地下二階へ/);
    // 坑夫灯を取らずに降りる
    choose(engine, /地下三階への坑道/);
    const crossText = choose(engine, /崩れた坑道を駆け抜ける/);
    expect(crossText).toContain("落石");
    const fightText = fightWithWeapon(engine); // 蜘蛛: 与ダメ0のまま敗北するはず
    expect(fightText).toContain("手応えがまるでない");
    expect(engine.getVariable("spider_beaten")).toBe(false);
    expect(engine.getVariable("last_battle_won")).toBe(false);
    expect(fightText).toContain("二度と起き上がらなかった");
    expect(isTerminal(engine)).toBe(true);
  });

  it("前提ゲート: 護符なしでは星喰らいに勝てず、資源が尽きても敗北EDに到達できる（ソフトロック無し）", () => {
    const engine = newGame();
    playToBossRoom(engine, { takeCharm: false });
    choose(engine, /星喰らいに挑む/);
    // 最悪プレイ: 薬草を使い果たしてから殴り続ける → 与ダメ0なので必ず敗北EDへ
    let text = "";
    for (let i = 0; i < 60; i++) {
      if (isTerminal(engine)) break;
      if (hasChoice(engine, /薬草を噛む/)) {
        text += choose(engine, /薬草を噛む/);
      } else if (hasChoice(engine, /得物を振るう/)) {
        text += choose(engine, /得物を振るう/);
      } else {
        throw new Error("戦闘中に選択肢が尽きた（デッドエンド）");
      }
    }
    expect(engine.getVariable("boss_beaten")).toBe(false);
    expect(text).toContain("二度と起き上がらなかった");
    expect(isTerminal(engine)).toBe(true);
  });

  it("逃走は撃破扱いにならない（勝敗フラグの取り違えなし）", () => {
    const engine = newGame();
    const text = choose(engine, /退いて間合いを離れる/);
    expect(text).toContain("徘徊");
    expect(engine.getVariable("rat_beaten")).toBe(false);
    // 撃破していないので先へは進めず、再戦の選択肢が出る
    expect(hasChoice(engine, /下り梯子で地下二階へ/)).toBe(false);
    expect(hasChoice(engine, /大鼠に立ち向かう/)).toBe(true);
  });

  it("一度きり戦闘は再訪で再発しない（真偽フラグ管理）", () => {
    const engine = newGame();
    fightWithWeapon(engine); // 大鼠を撃破
    expect(engine.getVariable("rat_beaten")).toBe(true);
    choose(engine, /下り梯子で地下二階へ/);
    const revisitText = choose(engine, /上り梯子で地下一階へ/);
    expect(revisitText).not.toContain("躍りかかってきた");
    expect(hasChoice(engine, /大鼠に立ち向かう/)).toBe(false);
    expect(hasChoice(engine, /下り梯子で地下二階へ/)).toBe(true);
  });

  it("有界探索でデッドエンドが無い（全状態で選択肢あり or 終端ED）", () => {
    const engine = new ScenarioEngine(STORY_JSON);
    const visited = new Set<string>();
    const queue: string[] = [];

    playOut(engine);
    queue.push(engine.getState());

    const LIMIT = 400;
    while (queue.length > 0 && visited.size < LIMIT) {
      const state = queue.pop() as string;
      if (visited.has(state)) continue;
      visited.add(state);

      engine.loadState(state);
      const choices = engine.currentChoices;
      if (choices.length === 0) {
        // 終端ED であること（本文が残ったまま選択肢ゼロで宙吊りにならない）
        expect(engine.canContinue()).toBe(false);
        continue;
      }
      for (const choice of choices) {
        engine.loadState(state);
        engine.chooseChoiceIndex(choice.index);
        playOut(engine);
        const next = engine.getState();
        if (!visited.has(next)) queue.push(next);
      }
    }
    expect(visited.size).toBeGreaterThan(50);
  });
});
