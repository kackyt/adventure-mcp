import blessed from "neo-blessed";
import type { GameController } from "../controller/game-controller.ts";
import type { Action, ViewModel } from "../controller/view-model.ts";
import { translateKey } from "./blessed-keys.ts";
import type { GameView } from "./game-view.ts";

const HELP_LINE = "[↑↓: 選択  Enter: 決定  数字: 直接選択  : コマンド  q/Esc: 終了]";

/**
 * neo-blessed による全画面 TUI View。
 *
 * ステータスバー / シーン本文 / 選択肢 / メッセージ行 / コマンド行の固定領域を
 * 持ち、コントローラの ViewModel を毎キー描画する。キー入力は Action に翻訳して
 * コントローラへ渡すだけの薄いアダプタ。
 */
export class BlessedView implements GameView {
  private readonly screen: blessed.Widgets.Screen;
  private readonly statusBox: blessed.Widgets.BoxElement;
  private readonly sceneBox: blessed.Widgets.BoxElement;
  private readonly choicesBox: blessed.Widgets.BoxElement;
  private readonly messageLine: blessed.Widgets.BoxElement;
  private readonly commandLine: blessed.Widgets.BoxElement;
  private destroyed = false;
  private resolveRun: ((code: number) => void) | null = null;

  constructor() {
    this.screen = blessed.screen({ smartCSR: true, title: "Adventure", fullUnicode: true });

    this.statusBox = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: "30%",
      border: "line",
      label: " ステータス ",
      tags: true,
      scrollable: true,
      style: { border: { fg: "gray" }, label: { fg: "gray" } },
    });
    this.sceneBox = blessed.box({
      top: "30%",
      left: 0,
      width: "100%",
      height: "40%",
      border: "line",
      label: " シーン ",
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      padding: { left: 1, right: 1 },
      style: { border: { fg: "gray" }, label: { fg: "white" } },
    });
    this.choicesBox = blessed.box({
      top: "70%",
      left: 0,
      width: "100%",
      bottom: 2,
      border: "line",
      label: " 選択肢 ",
      tags: true,
      scrollable: true,
      style: { border: { fg: "gray" }, label: { fg: "gray" } },
    });
    this.messageLine = blessed.box({
      bottom: 1,
      left: 0,
      width: "100%",
      height: 1,
      tags: true,
    });
    this.commandLine = blessed.box({
      bottom: 0,
      left: 0,
      width: "100%",
      height: 1,
      tags: true,
    });

    this.screen.append(this.statusBox);
    this.screen.append(this.sceneBox);
    this.screen.append(this.choicesBox);
    this.screen.append(this.messageLine);
    this.screen.append(this.commandLine);
  }

  run(controller: GameController): Promise<number> {
    return new Promise<number>((resolve) => {
      this.resolveRun = resolve;

      const dispatch = (action: Action): void => {
        controller.apply(action);
        if (controller.exitRequested) {
          this.finish(0);
          return;
        }
        this.render(controller.getViewModel());
      };

      this.screen.on(
        "keypress",
        (ch: string | undefined, key: blessed.Widgets.Events.IKeyEventArg) => {
          const action = translateKey(controller.getViewModel(), ch, key);
          if (action) dispatch(action);
        },
      );

      this.screen.on("resize", () => this.render(controller.getViewModel()));

      this.render(controller.getViewModel());
    });
  }

  private render(vm: ViewModel): void {
    if (this.destroyed) return;

    const variables = Object.entries(vm.status.variables);
    const statusText =
      variables.length === 0
        ? "{gray-fg}(変数なし){/gray-fg}"
        : variables
            .map(([k, v]) => `${esc(k)}={yellow-fg}${esc(formatValue(v))}{/yellow-fg}`)
            .join("    ");
    this.statusBox.setContent(statusText);

    this.sceneBox.setContent(esc(vm.scene));
    this.sceneBox.setScrollPerc(100);

    const choiceLines = vm.choices.map((choice, i) => {
      const label = `${i + 1}) ${esc(choice.label)}`;
      return choice.selected ? `{cyan-fg}▸ ${label}{/cyan-fg}` : `  ${label}`;
    });
    this.choicesBox.setContent(choiceLines.join("\n"));

    if (vm.message) {
      this.messageLine.setContent(
        vm.message.kind === "error"
          ? `{red-fg}${esc(vm.message.text)}{/red-fg}`
          : `{green-fg}${esc(vm.message.text)}{/green-fg}`,
      );
    } else {
      this.messageLine.setContent("");
    }

    this.commandLine.setContent(
      vm.command.active
        ? `{bold}入力>{/bold} ${esc(vm.command.buffer)}`
        : `{gray-fg}${HELP_LINE}{/gray-fg}`,
    );

    this.screen.render();
  }

  private finish(code: number): void {
    this.destroy();
    this.resolveRun?.(code);
    this.resolveRun = null;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.screen.destroy();
  }
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

/** blessed のタグ記法に解釈されないよう動的文字列をエスケープする。 */
function esc(text: string): string {
  return blessed.escape(text);
}
