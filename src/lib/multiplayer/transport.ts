/**
 * Transport abstraction — game UI talks to this, not to P2P or Colyseus directly.
 *
 * Release 1: interface + P2P adapter + authoritative UnoRoom (in-process).
 * A future Colyseus/WebSocket adapter implements the same surface.
 */

export type TransportConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "error";

export type TransportPlayer = {
  id: string;
  name: string;
  connected: boolean;
  host?: boolean;
  ready?: boolean;
  seat?: number;
};

export type TransportMessage = {
  type: string;
  payload?: unknown;
};

export interface GameTransport {
  readonly connectionState: TransportConnectionState;
  connect(opts: { roomId: string; playerId: string; name: string; token?: string }): Promise<void>;
  disconnect(): void;
  send(message: TransportMessage): void;
  onMessage(handler: (message: TransportMessage, from?: string) => void): () => void;
  onConnectionState(handler: (state: TransportConnectionState) => void): () => void;
  getPlayers(): TransportPlayer[];
}

/** No-op transport for offline / bot tables. */
export class NullTransport implements GameTransport {
  connectionState: TransportConnectionState = "idle";
  async connect(): Promise<void> {
    this.connectionState = "connected";
  }
  disconnect(): void {
    this.connectionState = "closed";
  }
  send(): void {}
  onMessage(): () => void {
    return () => {};
  }
  onConnectionState(): () => void {
    return () => {};
  }
  getPlayers(): TransportPlayer[] {
    return [];
  }
}
