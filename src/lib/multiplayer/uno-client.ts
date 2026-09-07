import { getBearerToken } from "@/lib/auth/client";
import type { UnoColor, UnoPublicState } from "@/lib/games/uno";
import { UnoRoom } from "./authoritative/uno-room";

export type UnoClientSnapshot = {
  roomId: string;
  phase: "WAITING" | "READY" | "PLAYING" | "FINISHED" | "CLOSED";
  players: Array<{ id: string; name: string; ready: boolean; connected: boolean; seat: number; host: boolean }>;
  view: UnoPublicState | null;
  selfId: string;
  error?: string;
};

export interface UnoClient {
  getSnapshot(): UnoClientSnapshot;
  subscribe(listener: (snapshot: UnoClientSnapshot) => void): () => void;
  join(name: string): Promise<UnoClientSnapshot>;
  leave(): Promise<UnoClientSnapshot>;
  ready(value: boolean): Promise<UnoClientSnapshot>;
  start(): Promise<UnoClientSnapshot>;
  play(cardId: string, color?: UnoColor): Promise<UnoClientSnapshot>;
  draw(): Promise<UnoClientSnapshot>;
  callUno(): Promise<UnoClientSnapshot>;
  rematch(): Promise<UnoClientSnapshot>;
  close(): Promise<UnoClientSnapshot>;
  dispose(): void;
}

type Listener = (snapshot: UnoClientSnapshot) => void;

export function createRemoteUnoClient(roomId: string): UnoClient {
  let snapshot: UnoClientSnapshot = {
    roomId,
    phase: "WAITING",
    players: [],
    view: null,
    selfId: "",
  };
  const listeners = new Set<Listener>();
  let timer: number | undefined;

  const publish = (next: UnoClientSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener(snapshot));
  };

  const request = async (op: string, extra: Record<string, unknown> = {}): Promise<UnoClientSnapshot> => {
    const token = getBearerToken();
    if (!token) {
      const next = { ...snapshot, error: "Sign in to play online UNO." };
      publish(next);
      return next;
    }
    const response = await fetch("/api/uno-room", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ op, roomId, ...extra }),
    });
    const data = (await response.json()) as Partial<UnoClientSnapshot> & { error?: string };
    if (!response.ok || data.error) throw new Error(data.error || "UNO request failed.");
    const next = { ...snapshot, ...data, roomId, error: undefined } as UnoClientSnapshot;
    publish(next);
    return next;
  };

  const refresh = async () => {
    const token = getBearerToken();
    if (!token) return;
    try {
      const response = await fetch(`/api/uno-room?roomId=${encodeURIComponent(roomId)}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as Partial<UnoClientSnapshot>;
      publish({ ...snapshot, ...data, roomId } as UnoClientSnapshot);
    } catch {
      // Polling is best-effort; the next tick retries.
    }
  };

  timer = window.setInterval(refresh, 750);
  void refresh();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    join: (name) => request("join", { name }),
    leave: () => request("leave"),
    ready: (value) => request("ready", { ready: value }),
    start: () => request("start"),
    play: (cardId, color) => request("play", { cardId, color }),
    draw: () => request("draw"),
    callUno: () => request("call_uno"),
    rematch: () => request("rematch"),
    close: () => request("close"),
    dispose: () => {
      if (timer !== undefined) window.clearInterval(timer);
      listeners.clear();
    },
  };
}

export function createLocalUnoClient(roomId: string): UnoClient {
  const room = new UnoRoom({ roomId });
  let selfId = "local-player";
  let snapshot: UnoClientSnapshot = { roomId, phase: room.phase, players: room.getPlayers(), view: null, selfId };
  const listeners = new Set<Listener>();
  const sync = () => {
    snapshot = { roomId, phase: room.phase, players: room.getPlayers(), view: room.viewFor(selfId), selfId };
    listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  };
  const dispatch = (command: Parameters<UnoRoom["dispatch"]>[0]) => {
    const error = room.dispatch(command);
    if (error) throw new Error(error);
    return sync();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); listener(snapshot); return () => listeners.delete(listener); },
    join: (name) => Promise.resolve(dispatch({ type: "join", playerId: selfId, name })),
    leave: () => Promise.resolve(dispatch({ type: "leave", playerId: selfId })),
    ready: (value) => Promise.resolve(dispatch({ type: "ready", playerId: selfId, ready: value })),
    start: () => Promise.resolve(dispatch({ type: "start", playerId: selfId })),
    play: (cardId, color) => Promise.resolve(dispatch({ type: "play", playerId: selfId, cardId, color })),
    draw: () => Promise.resolve(dispatch({ type: "draw", playerId: selfId })),
    callUno: () => Promise.resolve(dispatch({ type: "call_uno", playerId: selfId })),
    rematch: () => Promise.resolve(dispatch({ type: "rematch", playerId: selfId })),
    close: () => Promise.resolve(dispatch({ type: "close", playerId: selfId })),
    dispose: () => listeners.clear(),
  };
}
