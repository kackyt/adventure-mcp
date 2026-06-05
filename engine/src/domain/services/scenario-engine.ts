import { Story } from "inkjs/engine/Story";
import { EngineError } from "../../shared/errors/engine-error.ts";

export interface Choice {
  index: number;
  text: string;
}

export class ScenarioEngine {
  private story: Story;

  /**
   * シナリオエンジンを初期化します。
   * @param storyJson コンパイル済みのInkのJSONデータ（文字列またはオブジェクト）
   */
  constructor(storyJson: string | Record<string, unknown>) {
    try {
      if (typeof storyJson === "string") {
        this.story = new Story(storyJson);
      } else {
        this.story = new Story(storyJson);
      }
    } catch (e) {
      throw new EngineError("Failed to load story", e);
    }
  }

  /**
   * シナリオがさらに継続可能かどうかを判定します。
   */
  public canContinue(): boolean {
    return this.story.canContinue;
  }

  /**
   * シナリオを次のステップに進め、テキストを取得します。
   */
  public continue(): string {
    try {
      return this.story.Continue() ?? "";
    } catch (e) {
      throw new EngineError("Failed to continue story", e);
    }
  }

  /**
   * 現在選択可能な選択肢の一覧を取得します。
   */
  public get currentChoices(): Choice[] {
    try {
      return this.story.currentChoices.map((c) => ({
        index: c.index,
        text: c.text,
      }));
    } catch (e) {
      throw new EngineError("Failed to get current choices", e);
    }
  }

  /**
   * 指定されたインデックスの選択肢を選択します。
   * @param index 選択肢のインデックス
   */
  public chooseChoiceIndex(index: number): void {
    try {
      this.story.ChooseChoiceIndex(index);
    } catch (e) {
      throw new EngineError(`Failed to choose choice index: ${index}`, e);
    }
  }

  /**
   * 指定された名前の変数から値を取得します。
   * @param name 変数名
   */
  public getVariable(name: string): unknown {
    try {
      return this.story.variablesState[name];
    } catch (e) {
      throw new EngineError(`Failed to get variable: ${name}`, e);
    }
  }

  /**
   * 指定された名前の変数に値を設定します。
   * @param name 変数名
   * @param value 設定する値
   */
  public setVariable(name: string, value: unknown): void {
    try {
      this.story.variablesState[name] = value;
    } catch (e) {
      throw new EngineError(`Failed to set variable: ${name}`, e);
    }
  }
}
