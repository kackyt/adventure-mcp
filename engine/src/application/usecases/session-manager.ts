import { randomUUID } from "node:crypto";
import { ScenarioEngine } from "../../domain/services/scenario-engine.ts";
import { SessionError } from "../../shared/errors/session-error.ts";
import type { SaveEnvelope, Snapshot, StartedGame, Turn } from "../dtos/game-dtos.ts";
import type { SaveStoragePort } from "../ports/save-storage-port.ts";
import type { ScenarioStoragePort } from "../ports/scenario-storage-port.ts";
import type { SaveCodec } from "../services/save-codec.ts";
import { GameSession } from "./game-session.ts";

/**
 * 複数の {@link GameSession} を sessionId で束ねる Primary Port。
 * sessionId の採番・複数同時保持・破棄という MCP 固有の関心事をここに集約し、
 * mcp-server は本クラスの薄いアダプタとして実装される。生の Ink 変数や
 * `GameSession.debug` は外へ出さない（公開スナップショットのみ）。
 */
export class SessionManager {
  private readonly sessions = new Map<string, { session: GameSession; scenarioId: string }>();

  constructor(
    private readonly storage: ScenarioStoragePort,
    private readonly saveStorage?: SaveStoragePort,
    private readonly saveCodec?: SaveCodec,
  ) {}

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
    this.sessions.set(sessionId, { session, scenarioId });
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

  /**
   * @throws {Error} セーブ機能が無効な場合
   */
  saveGame(sessionId: string, saveId: string): { ok: true } {
    if (!this.saveStorage || !this.saveCodec) {
      throw new Error("セーブ機能が設定されていません。");
    }
    const { session, scenarioId } = this.getSessionEntry(sessionId);
    const envelope: SaveEnvelope = {
      saveId,
      scenarioId,
      savedAt: new Date().toISOString(),
      schemaVersion: 1,
      session: session.serialize(),
    };
    const text = this.saveCodec.encode(envelope);
    this.saveStorage.save(saveId, text);
    return { ok: true };
  }

  /**
   * @throws {Error} セーブ機能が無効な場合
   * @throws {SessionError} unknown_save / save_tampered / unknown_scenario
   */
  loadGame(saveId: string): StartedGame {
    if (!this.saveStorage || !this.saveCodec) {
      throw new Error("セーブ機能が設定されていません。");
    }
    const text = this.saveStorage.load(saveId);
    const envelope = this.saveCodec.decode(text);
    const scenarioId = envelope.scenarioId;

    if (!this.storage.listScenarioIds().includes(scenarioId)) {
      throw new SessionError(
        "unknown_scenario",
        `セーブデータに含まれるシナリオが見つかりません: ${scenarioId}`,
      );
    }
    const json = this.storage.loadScenarioJson(scenarioId);
    const engine = new ScenarioEngine(json);
    const session = GameSession.restore(engine, envelope.session);

    const sessionId = randomUUID();
    this.sessions.set(sessionId, { session, scenarioId });
    return { sessionId, ...session.getSituation() };
  }

  listSaves(): string[] {
    if (!this.saveStorage) return [];
    return this.saveStorage.list();
  }

  /**
   * @throws {Error} セーブ機能が無効な場合
   * @throws {SessionError} unknown_save
   */
  deleteSave(saveId: string): { ok: true } {
    if (!this.saveStorage) {
      throw new Error("セーブ機能が設定されていません。");
    }
    this.saveStorage.delete(saveId);
    return { ok: true };
  }

  private getSessionEntry(sessionId: string): { session: GameSession; scenarioId: string } {
    const entry = this.sessions.get(sessionId);
    if (!entry) {
      throw new SessionError("unknown_session", `不明なセッションです: ${sessionId}`);
    }
    return entry;
  }

  private getSession(sessionId: string): GameSession {
    return this.getSessionEntry(sessionId).session;
  }
}
