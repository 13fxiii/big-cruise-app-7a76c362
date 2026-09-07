/**
 * Authoritative UNO room — pure server logic.
 * Owns deck, hands, turns, winner. Clients only send intents.
 * Uses transport-neutral rules in src/lib/games/uno.ts.
 */
import {
  callUno,
  createUnoGame,
  drawCards,
  playCard,
  publicUnoState,
  type UnoColor,
  type UnoPublicState,
  type UnoRandom,
  type UnoState,
  UnoRuleError,
} from "../../games/uno.ts";

export type UnoRoomPhase = "WAITING" | "READY" | "PLAYING" | "FINISHED" | "CLOSED";

export type UnoRoomPlayer = {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  seat: number;
  host: boolean;
};

export type UnoRoomCommand =
  | { type: "join"; playerId: string; name: string }
  | { type: "leave"; playerId: string }
  | { type: "ready"; playerId: string; ready: boolean }
  | { type: "start"; playerId: string }
  | { type: "play"; playerId: string; cardId: string; color?: UnoColor }
  | { type: "draw"; playerId: string }
  | { type: "call_uno"; playerId: string }
  | { type: "rematch"; playerId: string }
  | { type: "close"; playerId: string };

export type UnoRoomEvent =
  | { type: "error"; playerId?: string; message: string }
  | { type: "phase"; phase: UnoRoomPhase }
  | { type: "roster"; players: UnoRoomPlayer[] }
  | { type: "view"; playerId: string; view: UnoPublicState }
  | { type: "finished"; winnerId: string };

export type UnoRoomOptions = {
  roomId: string;
  maxPlayers?: number;
  minPlayers?: number;
  random?: UnoRandom;
  emit?: (event: UnoRoomEvent) => void;
};

const MAX_DEFAULT = 10;
const MIN_DEFAULT = 2;

export class UnoRoom {
  readonly roomId: string;
  private readonly maxPlayers: number;
  private readonly minPlayers: number;
  private readonly random: UnoRandom;
  private readonly emitFn: (event: UnoRoomEvent) => void;

  phase: UnoRoomPhase = "WAITING";
  private players: UnoRoomPlayer[] = [];
  private game: UnoState | null = null;

  constructor(opts: UnoRoomOptions) {
    this.roomId = opts.roomId;
    this.maxPlayers = opts.maxPlayers ?? MAX_DEFAULT;
    this.minPlayers = opts.minPlayers ?? MIN_DEFAULT;
    this.random = opts.random ?? Math.random;
    this.emitFn = opts.emit ?? (() => {});
  }

  getPlayers(): UnoRoomPlayer[] {
    return this.players.map((p) => ({ ...p }));
  }

  /** Dispatch a client intent. Returns a stable validation error for HTTP callers. */
  dispatch(cmd: UnoRoomCommand): string | null {
    try {
      switch (cmd.type) {
        case "join":
          this.join(cmd.playerId, cmd.name);
          break;
        case "leave":
          this.leave(cmd.playerId);
          break;
        case "ready":
          this.setReady(cmd.playerId, cmd.ready);
          break;
        case "start":
          this.start(cmd.playerId);
          break;
        case "play":
          this.play(cmd.playerId, cmd.cardId, cmd.color);
          break;
        case "draw":
          this.draw(cmd.playerId);
          break;
        case "call_uno":
          this.call(cmd.playerId);
          break;
        case "rematch":
          this.rematch(cmd.playerId);
          break;
        case "close":
          this.close(cmd.playerId);
          break;
        default:
          this.fail(cmd, "Unknown command.");
      }
      return null;
    } catch (err) {
      const message = err instanceof UnoRuleError || err instanceof Error ? err.message : "Action rejected.";
      this.emitFn({ type: "error", playerId: "playerId" in cmd ? cmd.playerId : undefined, message });
      return message;
    }
  }

  viewFor(playerId: string): UnoPublicState | null {
    if (!this.game) return null;
    return publicUnoState(this.game, playerId);
  }

  private fail(cmd: UnoRoomCommand, message: string): never {
    throw new UnoRuleError(message);
  }

  private emitRoster(): void {
    this.emitFn({ type: "roster", players: this.getPlayers() });
  }

  private emitPhase(): void {
    this.emitFn({ type: "phase", phase: this.phase });
  }

  private emitViews(): void {
    if (!this.game) return;
    for (const p of this.players) {
      if (!p.connected) continue;
      this.emitFn({ type: "view", playerId: p.id, view: publicUnoState(this.game, p.id) });
    }
  }

  private join(playerId: string, name: string): void {
    const existing = this.players.find((p) => p.id === playerId);
    if (existing) {
      existing.connected = true;
      existing.name = name.trim() || existing.name;
      this.emitRoster();
      this.emitViews();
      return;
    }
    if (this.phase !== "WAITING" && this.phase !== "READY") {
      throw new UnoRuleError("This room is not accepting players.");
    }
    if (this.players.length >= this.maxPlayers) {
      throw new UnoRuleError("Room is full.");
    }
    const seat = this.players.length;
    const host = this.players.length === 0;
    this.players.push({
      id: playerId,
      name: name.trim() || `Player ${seat + 1}`,
      ready: false,
      connected: true,
      seat,
      host,
    });
    this.phase = "WAITING";
    this.emitPhase();
    this.emitRoster();
  }

  private leave(playerId: string): void {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx < 0) return;
    if (this.phase === "PLAYING") {
      this.players[idx].connected = false;
      this.emitRoster();
      return;
    }
    const wasHost = this.players[idx].host;
    this.players.splice(idx, 1);
    this.players.forEach((p, i) => {
      p.seat = i;
    });
    if (wasHost && this.players[0]) this.players[0].host = true;
    if (this.players.length === 0) {
      this.phase = "CLOSED";
      this.game = null;
      this.emitPhase();
    }
    this.emitRoster();
  }

  private setReady(playerId: string, ready: boolean): void {
    const p = this.players.find((x) => x.id === playerId);
    if (!p) throw new UnoRuleError("Player is not in this room.");
    if (this.phase !== "WAITING" && this.phase !== "READY") {
      throw new UnoRuleError("Cannot change ready state now.");
    }
    p.ready = ready;
    const enough = this.players.length >= this.minPlayers;
    const allReady = enough && this.players.every((x) => x.ready);
    this.phase = allReady ? "READY" : "WAITING";
    this.emitPhase();
    this.emitRoster();
  }

  private start(playerId: string): void {
    const host = this.players.find((p) => p.host);
    if (!host || host.id !== playerId) throw new UnoRuleError("Only the host can start.");
    if (this.players.length < this.minPlayers) throw new UnoRuleError("Not enough players.");
    if (!this.players.every((p) => p.ready)) throw new UnoRuleError("All players must be ready.");
    this.game = createUnoGame(
      this.players.map((p) => ({ id: p.id, name: p.name })),
      this.random,
    );
    this.phase = "PLAYING";
    this.emitPhase();
    this.emitViews();
  }

  private play(playerId: string, cardId: string, color?: UnoColor): void {
    if (this.phase !== "PLAYING" || !this.game) throw new UnoRuleError("Game is not in progress.");
    playCard(this.game, playerId, cardId, color);
    if (this.game.winner) {
      this.phase = "FINISHED";
      this.emitPhase();
      this.emitViews();
      this.emitFn({ type: "finished", winnerId: this.game.winner });
      return;
    }
    this.emitViews();
  }

  private draw(playerId: string): void {
    if (this.phase !== "PLAYING" || !this.game) throw new UnoRuleError("Game is not in progress.");
    drawCards(this.game, playerId);
    this.emitViews();
  }

  private call(playerId: string): void {
    if (this.phase !== "PLAYING" || !this.game) throw new UnoRuleError("Game is not in progress.");
    callUno(this.game, playerId);
    this.emitViews();
  }

  private rematch(playerId: string): void {
    const host = this.players.find((p) => p.host);
    if (!host || host.id !== playerId) throw new UnoRuleError("Only the host can rematch.");
    if (this.phase !== "FINISHED") throw new UnoRuleError("Rematch is only available after a game ends.");
    for (const p of this.players) p.ready = false;
    this.game = null;
    this.phase = "WAITING";
    this.emitPhase();
    this.emitRoster();
  }

  private close(playerId: string): void {
    const host = this.players.find((p) => p.host);
    if (!host || host.id !== playerId) throw new UnoRuleError("Only the host can close the room.");
    this.phase = "CLOSED";
    this.game = null;
    this.players = [];
    this.emitPhase();
    this.emitRoster();
  }
}
