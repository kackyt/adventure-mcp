import blessed from "neo-blessed";
import type { GameController } from "../controller/game-controller.ts";
import type { Action, ViewModel } from "../controller/view-model.ts";
import { translateKey } from "./blessed-keys.ts";
import type { IGameView } from "./game-view.interface.ts";

const HELP_LINE =
  "[↑↓: 選択  Enter: 決定  数字: 直接選択  : コマンド(:get/:set/:vars)  q/Esc: 終了]";

/**
 * neo-blessed による全画面 TUI View。
 *
 * ステータスバー / シーン本文 / 選択肢 / メッセージ行 / コマンド行の固定領域を
 * 持ち、コントローラの ViewModel を毎キー描画する。キー入力は Action に翻訳して
 * コントローラへ渡すだけの薄いアダプタ。
 */
export class BlessedView implements IGameView {
  private readonly screen: blessed.Widgets.Screen;
  private readonly statusBox: blessed.Widgets.BoxElement;
  private readonly sceneBox: blessed.Widgets.BoxElement;
  private readonly choicesBox: blessed.Widgets.BoxElement;
  private readonly messageLine: blessed.Widgets.BoxElement;
  private readonly commandLine: blessed.Widgets.BoxElement;
  private destroyed = false;
  private resolveRun: ((code: number) => void) | null = null;
  // 実 blessed は Enter 1 回で enter と return の 2 イベントを発火するため、
  // 同一押下の二重処理を防ぐラッチ（同期バーストの間だけ有効）
  private enterLatched = false;

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
          // Enter は enter / return の 2 イベントで届くため、同一押下を 1 回に集約する
          if (key.name === "enter" || key.name === "return") {
            if (this.enterLatched) return;
            this.enterLatched = true;
            queueMicrotask(() => {
              this.enterLatched = false;
            });
          }
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

    // ステータス（全変数）の表示/非表示。非表示時はシーン領域を上端まで広げる
    if (vm.status.visible) {
      this.statusBox.show();
      this.sceneBox.top = "30%";
      this.sceneBox.height = "40%";
      const variables = Object.entries(vm.status.variables);
      this.statusBox.setContent(
        variables.length === 0
          ? "{gray-fg}(変数なし){/gray-fg}"
          : variables
              .map(([k, v]) => `${esc(k)}={yellow-fg}${esc(formatValue(v))}{/yellow-fg}`)
              .join("    "),
      );
    } else {
      this.statusBox.hide();
      this.sceneBox.top = 0;
      this.sceneBox.height = "70%";
    }

    this.sceneBox.setContent(esc(vm.scene));
    this.sceneBox.setScrollPerc(100);

    if (vm.ended) {
      this.choicesBox.setContent(
        "{yellow-fg}━━━ 終わり ━━━{/yellow-fg}\n{gray-fg}（Enter または q で終了）{/gray-fg}",
      );
    } else {
      const choiceLines = vm.choices.map((choice, i) => {
        const label = `${i + 1}) ${esc(choice.label)}`;
        return choice.selected ? `{cyan-fg}▸ ${label}{/cyan-fg}` : `  ${label}`;
      });
      this.choicesBox.setContent(choiceLines.join("\n"));
    }

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
