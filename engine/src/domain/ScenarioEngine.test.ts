import { describe, it, expect, beforeEach } from 'vitest';
import { Compiler } from 'inkjs/compiler/Compiler';
import { ScenarioEngine } from './ScenarioEngine';
import { EngineError } from './error/EngineError';

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

describe('ScenarioEngine', () => {
  let storyJson: any;

  beforeEach(() => {
    const compiler = new Compiler(inkSource);
    storyJson = compiler.Compile().ToJson();
  });

  it('should continue story and return text', () => {
    const engine = new ScenarioEngine(storyJson);
    expect(engine.canContinue()).toBe(true);
    const text = engine.continue();
    expect(text.trim()).toBe('You are in a dark room.');
  });

  it('should get choices and choose one', () => {
    const engine = new ScenarioEngine(storyJson);
    engine.continue(); // "You are in a dark room."
    
    const choices = engine.currentChoices;
    expect(choices).toHaveLength(2);
    expect(choices[0].text).toBe('Look around');
    expect(choices[1].text).toBe('Wait');

    engine.chooseChoiceIndex(0);
    const text2 = engine.continue();
    expect(text2.trim()).toBe('You see a door.');
  });

  it('should get and set variables', () => {
    const engine = new ScenarioEngine(storyJson);
    expect(engine.getVariable('player_hp')).toBe(100);

    engine.setVariable('player_hp', 50);
    expect(engine.getVariable('player_hp')).toBe(50);
  });

  it('should throw EngineError on invalid JSON', () => {
    expect(() => new ScenarioEngine({ invalid: "data" })).toThrow(EngineError);
  });
});
