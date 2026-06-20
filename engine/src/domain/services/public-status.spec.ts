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
});
