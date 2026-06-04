import { Story } from 'inkjs/engine/Story';
import { EngineError } from './error/EngineError';

export interface Choice {
  index: number;
  text: string;
}

export class ScenarioEngine {
  private story: Story;

  constructor(storyJson: string | object) {
    try {
      this.story = new Story(storyJson);
    } catch (e) {
      throw new EngineError('Failed to load story', e);
    }
  }

  public canContinue(): boolean {
    return this.story.canContinue;
  }

  public continue(): string {
    try {
      return this.story.Continue() ?? '';
    } catch (e) {
      throw new EngineError('Failed to continue story', e);
    }
  }

  public get currentChoices(): Choice[] {
    try {
      return this.story.currentChoices.map(c => ({
        index: c.index,
        text: c.text
      }));
    } catch (e) {
      throw new EngineError('Failed to get current choices', e);
    }
  }

  public chooseChoiceIndex(index: number): void {
    try {
      this.story.ChooseChoiceIndex(index);
    } catch (e) {
      throw new EngineError(`Failed to choose choice index: ${index}`, e);
    }
  }

  public getVariable(name: string): unknown {
    try {
      return this.story.variablesState[name];
    } catch (e) {
      throw new EngineError(`Failed to get variable: ${name}`, e);
    }
  }

  public setVariable(name: string, value: unknown): void {
    try {
      this.story.variablesState[name] = value;
    } catch (e) {
      throw new EngineError(`Failed to set variable: ${name}`, e);
    }
  }
}
