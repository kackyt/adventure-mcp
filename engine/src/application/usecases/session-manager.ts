import { randomUUID } from "node:crypto";
import { ScenarioEngine } from "../../domain/services/scenario-engine.ts";
import type { ScenarioStoragePort } from "../../ports/scenario-storage-port.ts";
import { SessionError } from "../../shared/errors/session-error.ts";
import type { Snapshot, StartedGame, Turn } from "../dtos/game-dtos.ts";
import { GameSession } from "./game-session.ts";

/**
 * 複数の {@link GameSession} を sessionId で束ねる Primary Port。
 * sessionId の採番・複数同時保持・破棄という MCP 固有の関心事をここに集約し、
 * mcp-server は本クラスの薄いアダプタとして実装される。生の Ink 変数や
 * `GameSession.debug` は外へ出さない（公開スナップショットのみ）。
 */
export class SessionManager {
  private readonly sessions = new Map<string, GameSession>();

  constructor(private readonly storage: ScenarioStoragePort) {}

  /** 利用可能なシナリオ id 一覧。 */
  listScenarios(): string[] {
    return this.storage.listScenarioIds();
  }

  /**
   * シナリオを読み込み、最初の選択肢提示（または終端）まで前進した新規セッションを作る。
   * @throws {SessionError} unknown_scenario
   */
  startGame(scenarioId: string): StartedGame {
    if (!this.storage.listScenarioIds().includes(scenarioId)) {
      throw new SessionError("unknown_scenario", `不明なシナリオです: ${scenarioId}`);
    }
    const json = this.storage.loadScenarioJson(scenarioId);
    const session = new GameSession(new ScenarioEngine(json));
    const sessionId = randomUUID();
    this.sessions.set(sessionId, session);
    return { sessionId, ...session.getSituation() };
  }

  /**
   * @throws {SessionError} unknown_session / game_already_ended / choice_out_of_range / choice_mismatch
   */
  choose(sessionId: string, index: number, expectedText?: string): Snapshot {
    return this.getSession(sessionId).choose(index, expectedText);
  }

  /** @throws {SessionError} unknown_session */
  getSituation(sessionId: string): Snapshot {
    return this.getSession(sessionId).getSituation();
  }

  /** @throws {SessionError} unknown_session */
  getHistory(sessionId: string): { turns: Turn[] } {
    return this.getSession(sessionId).getHistory();
  }

  /**
   * セッションを破棄する。終端到達では自動破棄されず、end_game を明示するまで履歴を引ける。
   * @throws {SessionError} unknown_session
   */
  endGame(sessionId: string): { ok: true } {
    if (!this.sessions.delete(sessionId)) {
      throw new SessionError("unknown_session", `不明なセッションです: ${sessionId}`);
    }
    return { ok: true };
  }

  private getSession(sessionId: string): GameSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionError("unknown_session", `不明なセッションです: ${sessionId}`);
    }
    return session;
  }
}
