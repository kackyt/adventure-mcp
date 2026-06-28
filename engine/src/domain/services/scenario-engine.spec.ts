import { Compiler } from "inkjs/compiler/Compiler";
import { beforeEach, describe, expect, it } from "vitest";
import { EngineError } from "../../shared/errors/engine-error.ts";
import { ScenarioEngine } from "./scenario-engine.ts";

const inkSource = `
VAR player_hp = 100

You are in a dark room.
* [Look around]
  You see a door.
  * * [Open door]
      You opened the door.
      ~ player_hp = 90
      -> DONE
* [Wait]
  Nothing happens.
  -> DONE
`;

describe("ScenarioEngine", () => {
  let storyJson: string | Record<string, unknown>;

  beforeEach(() => {
    const compiler = new Compiler(inkSource);
    const json = compiler.Compile().ToJson();
    if (!json) {
      throw new Error("Compilation failed");
    }
    storyJson = json;
  });

  it("should continue story and return text", () => {
    const engine = new ScenarioEngine(storyJson);
    expect(engine.canContinue()).toBe(true);
    const text = engine.continue();
    expect(text.trim()).toBe("You are in a dark room.");
  });

  it("should get choices and choose one", () => {
    const engine = new ScenarioEngine(storyJson);
    engine.continue(); // "You are in a dark room."

    const choices = engine.currentChoices;
    expect(choices).toHaveLength(2);
    expect(choices[0].text).toBe("Look around");
    expect(choices[1].text).toBe("Wait");

    engine.chooseChoiceIndex(0);
    const text2 = engine.continue();
    expect(text2.trim()).toBe("You see a door.");
  });

  it("should get and set variables", () => {
    const engine = new ScenarioEngine(storyJson);
    expect(engine.getVariable("player_hp")).toBe(100);

    engine.setVariable("player_hp", 50);
    expect(engine.getVariable("player_hp")).toBe(50);
  });

  it("should get a snapshot of all variables", () => {
    const engine = new ScenarioEngine(storyJson);
    const vars = engine.getVariables();
    expect(vars).toHaveProperty("player_hp", 100);

    engine.setVariable("player_hp", 30);
    expect(engine.getVariables().player_hp).toBe(30);
  });

  it("should throw EngineError on invalid JSON", () => {
    expect(() => new ScenarioEngine({ invalid: "data" })).toThrow(EngineError);
  });

  it("should get and load state successfully", () => {
    const engine1 = new ScenarioEngine(storyJson);
    engine1.continue(); // "You are in a dark room."
    engine1.chooseChoiceIndex(0); // "Look around"
    engine1.continue(); // "You see a door."

    const stateJson = engine1.getState();

    const engine2 = new ScenarioEngine(storyJson);
    engine2.loadState(stateJson);

    // engine2 の状態が復元されているか確認
    expect(engine2.getVariables().player_hp).toBe(100);
    const choices = engine2.currentChoices;
    expect(choices).toHaveLength(1);
    expect(choices[0].text).toBe("Open door");
  });
});
