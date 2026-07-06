import { Compiler } from "inkjs/compiler/Compiler";
import { describe, expect, it } from "vitest";
import { ScenarioEngine } from "./scenario-engine.ts";

function compile(source: string): string {
  const json = new Compiler(source).Compile().ToJson();
  if (!json) {
    throw new Error("Compilation failed");
  }
  return json;
}

describe("ScenarioEngine.getPublicVariables", () => {
  it("public_status に列挙された変数のみ返し、解法フラグと public_status 自体は含めない", () => {
    const engine = new ScenarioEngine(
      compile(`
VAR player_hp = 20
VAR has_master_key = false
VAR public_status = "player_hp"

本文。
-> DONE
`),
    );
    const status = engine.getPublicVariables();
    expect(status).toEqual({ player_hp: 20 });
    expect(status).not.toHaveProperty("has_master_key");
    expect(status).not.toHaveProperty("public_status");
  });

  it("複数の公開変数を宣言順に依存せず取り出す", () => {
    const engine = new ScenarioEngine(
      compile(`
VAR gold = 0
VAR location = "entrance"
VAR secret = true
VAR public_status = "gold, location"

本文。
-> DONE
`),
    );
    expect(engine.getPublicVariables()).toEqual({ gold: 0, location: "entrance" });
  });

  it("public_status 未宣言なら空オブジェクト", () => {
    const engine = new ScenarioEngine(
      compile(`
VAR hp = 10

本文。
-> DONE
`),
    );
    expect(engine.getPublicVariables()).toEqual({});
  });

  it("実在しない変数名は無視する", () => {
    const engine = new ScenarioEngine(
      compile(`
VAR hp = 10
VAR public_status = "hp, nonexistent"

本文。
-> DONE
`),
    );
    expect(engine.getPublicVariables()).toEqual({ hp: 10 });
  });

  it("LIST は ', ' 区切りの文字列に正規化して返す", () => {
    const engine = new ScenarioEngine(
      compile(`
LIST equipment = (rusty_sword), iron_sword, torch
VAR public_status = "equipment"

本文。
~ equipment += torch
-> DONE
`),
    );
    while (engine.canContinue()) engine.continue();
    expect(engine.getPublicVariables()).toEqual({ equipment: "rusty_sword, torch" });
  });

  it("空になった LIST はキーを維持して空文字列で返す", () => {
    const engine = new ScenarioEngine(
      compile(`
LIST equipment = (rusty_sword)
VAR public_status = "equipment"

本文。
~ equipment -= rusty_sword
-> DONE
`),
    );
    while (engine.canContinue()) engine.continue();
    expect(engine.getPublicVariables()).toEqual({ equipment: "" });
  });

  it("InkList 以外の非プリミティブ値（divert target）は公開結果から除外し例外を投げない", () => {
    const engine = new ScenarioEngine(
      compile(`
VAR checkpoint = -> somewhere
VAR hp = 10
VAR public_status = "checkpoint, hp"

本文。
-> DONE

=== somewhere ===
別の場所。
-> DONE
`),
    );
    expect(engine.getPublicVariables()).toEqual({ hp: 10 });
  });
});
