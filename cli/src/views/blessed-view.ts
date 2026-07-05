import blessed from "neo-blessed";
import type { GameController } from "../controller/game-controller.ts";
import type { Action, ViewModel } from "../controller/view-model.ts";
import { translateKey } from "./blessed-keys.ts";
import type { IGameView } from "./game-view.interface.ts";

const HELP_LINE =
  "[↑↓: 選択  Enter: 決定  数字: 直接選択  PgUp/PgDn: 本文送り  Ctrl-G: コマンド  q/Esc: 終了]";
const INPUT_HELP_LINE =
  "[文字を入力  Enter: 送信  Backspace: 削除  Esc: 消去  Ctrl-G: コマンド  Ctrl-C: 終了]";

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
  // 直近に描画したシーン本文。変わったときだけスクロールを先頭へ戻す（手動スクロールを保持）
  private lastScene: string | null = null;
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
      // 端末の暗いパレットで gray が黒に潰れて枠・ラベルが見えなくなるため明色にする
      style: { border: { fg: "white" }, label: { fg: "cyan" } },
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
      style: { border: { fg: "white" }, label: { fg: "cyan" } },
    });
    // top/height は毎描画 applyLayout() が端末サイズと選択肢数に応じて数値で設定する
    this.choicesBox = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: 3,
      border: "line",
      label: " 選択肢 ",
      tags: true,
      scrollable: true,
      style: { border: { fg: "white" }, label: { fg: "cyan" } },
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
          // 本文（シーン）のスクロールはゲーム状態を変えないビュー内操作として先に処理する
          if (this.handleSceneScroll(controller.getViewModel(), key)) return;
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

    // 端末サイズと選択肢数に応じて各領域の高さを配分する（選択肢が潰れないよう優先確保）
    this.applyLayout(vm);

    // ステータス（全変数）の内容。表示/非表示・高さは applyLayout() が決める
    if (vm.status.visible) {
      const variables = Object.entries(vm.status.variables);
      this.statusBox.setContent(
        variables.length === 0
          ? "{gray-fg}(変数なし){/gray-fg}"
          : variables
              .map(([k, v]) => `${esc(k)}={yellow-fg}${esc(formatValue(v))}{/yellow-fg}`)
              .join("    "),
      );
    }

    // シーン本文。新しい本文になったときだけ先頭へ戻し、同一本文の再描画では
    // ユーザーの手動スクロール位置（PgUp/PgDn）を保持する。
    this.sceneBox.setContent(esc(vm.scene));
    if (vm.scene !== this.lastScene) {
      this.lastScene = vm.scene;
      this.sceneBox.setScrollPerc(0);
    }
    // 現在地（公開ステータスの place）＋本文のスクロール可否をシーン枠のラベルに表示する。
    const sceneBase = vm.location !== null ? `現在地: ${esc(vm.location)}` : "シーン";
    this.sceneBox.setLabel(this.boxLabel(sceneBase, this.sceneBox));

    if (vm.ended) {
      this.choicesBox.setLabel(" 選択肢 ");
      this.choicesBox.setContent(
        "{yellow-fg}━━━ 終わり ━━━{/yellow-fg}\n{gray-fg}（Enter または q で終了）{/gray-fg}",
      );
    } else if (vm.input.active) {
      this.choicesBox.setLabel(" 選択肢 ");
      this.choicesBox.setContent(
        "{cyan-fg}▸ 自由入力待ち{/cyan-fg}\n{gray-fg}（最下段に回答を入力し Enter で送信）{/gray-fg}",
      );
    } else {
      const choiceLines = vm.choices.map((choice, i) => {
        const label = `${i + 1}) ${esc(choice.label)}`;
        return choice.selected ? `{cyan-fg}▸ ${label}{/cyan-fg}` : `  ${label}`;
      });
      this.choicesBox.setContent(choiceLines.join("\n"));
      // 選択肢が枠を超えても選択中の行が枠外に消えないよう、その行へスクロールを追従させる
      const selectedIndex = vm.choices.findIndex((c) => c.selected);
      if (selectedIndex >= 0) {
        this.choicesBox.scrollTo(selectedIndex);
      }
      // 枠外に隠れた選択肢がある向きをラベルの矢印で示す（scrollTo 後の位置で判定）
      this.choicesBox.setLabel(this.boxLabel("選択肢", this.choicesBox));
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
        : vm.input.active
          ? `{bold}回答>{/bold} ${esc(vm.input.buffer)}{inverse} {/inverse}  {gray-fg}${INPUT_HELP_LINE}{/gray-fg}`
          : `{green-fg}${HELP_LINE}{/green-fg}`,
    );

    this.screen.render();
  }

  /**
   * ステータス / シーン / 選択肢の 3 領域を、端末の高さと選択肢数に応じて配分する。
   * 固定割合だと背の低い端末で選択肢枠が潰れて見えなくなるため、選択肢に内容ぶんの
   * 高さ（最大でも本体の半分）を優先確保し、シーンを可変にする。窮屈なときは
   * ステータス → 選択肢の順に削って本文の最低高を確保する。
   */
  private applyLayout(vm: ViewModel): void {
    const SCENE_MIN = 3;
    const CH_MIN = 3;
    // 最下部の 2 行（メッセージ行・コマンド行）を除いた領域を 3 枠で分ける
    const rows = Math.max(6, Number(this.screen.height) || 24);
    const body = rows - 2;

    let statusH = vm.status.visible ? 3 : 0;
    const contentLines = vm.ended || vm.input.active ? 2 : Math.max(1, vm.choices.length);
    const choicesCap = Math.max(CH_MIN, Math.floor(body / 2));
    let choicesH = Math.min(contentLines + 2, choicesCap); // +2 は上下ボーダー

    let sceneH = body - statusH - choicesH;
    if (sceneH < SCENE_MIN && statusH > 0) {
      // 窮屈ならステータスを畳んで本文・選択肢を優先
      statusH = 0;
      sceneH = body - choicesH;
    }
    if (sceneH < SCENE_MIN) {
      // まだ足りなければ選択肢を最低高まで詰める
      choicesH = Math.max(CH_MIN, choicesH - (SCENE_MIN - sceneH));
      sceneH = body - statusH - choicesH;
    }
    if (sceneH < 0) {
      // 極小端末の最終防衛: 選択肢を最優先で残す
      sceneH = 0;
      choicesH = body - statusH;
    }

    if (statusH > 0) {
      this.statusBox.show();
      this.statusBox.top = 0;
      this.statusBox.height = statusH;
    } else {
      this.statusBox.hide();
    }
    this.sceneBox.top = statusH;
    this.sceneBox.height = sceneH;
    this.choicesBox.top = statusH + sceneH;
    this.choicesBox.height = choicesH;
  }

  /**
   * 枠のラベルを「基題＋スクロール可否の矢印」で組み立てる。
   * 隠れた内容が上にあれば ▲、下にあれば ▼、両方なら ▲▼ を付ける。
   */
  private boxLabel(base: string, box: blessed.Widgets.BoxElement): string {
    const arrows = this.scrollArrows(box);
    return arrows ? ` ${base} ${arrows} ` : ` ${base} `;
  }

  /** 枠内にスクロールで隠れている内容の向きを示す矢印文字列（無ければ空）。 */
  private scrollArrows(box: blessed.Widgets.BoxElement): string {
    const total = box.getScrollHeight();
    const visible = Number(box.height) - Number(box.iheight);
    const top = box.childBase;
    const above = top > 0;
    const below = total - top > visible;
    if (above && below) return "▲▼";
    if (above) return "▲";
    if (below) return "▼";
    return "";
  }

  /**
   * 本文（シーン）のスクロール操作を処理する。ゲーム状態は変えず、シーン枠だけを
   * 上下にスクロールして再描画する。処理したら true を返し、キー翻訳を抑止する。
   */
  private handleSceneScroll(vm: ViewModel, key: blessed.Widgets.Events.IKeyEventArg): boolean {
    const id = key.full ?? key.name;
    // PgUp / PgDn 以外のキー入力なら false を返して後続の文字入力処理へ委譲
    if (id !== "pageup" && id !== "pagedown") {
      return false;
    }

    const page = Math.max(1, Number(this.sceneBox.height) - Number(this.sceneBox.iheight) - 1);
    if (id === "pageup") {
      this.sceneBox.scroll(-page);
    } else if (id === "pagedown") {
      this.sceneBox.scroll(page);
    }
    
    this.render(vm); // 本文は不変なのでスクロール位置は保持される
    return true;
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
