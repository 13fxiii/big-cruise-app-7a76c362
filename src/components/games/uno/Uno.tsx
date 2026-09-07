"use client";

import { GameShell } from "@/components/games/Shell";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createRemoteUnoClient, type UnoClientSnapshot } from "@/lib/multiplayer/uno-client";
import { getGame } from "@/lib/games/catalog";
import type { UnoColor, UnoCard } from "@/lib/games/uno";
import { useEffect, useMemo, useState } from "react";

const game = getGame("uno")!;
const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];

function cardLabel(card: UnoCard): string {
  if (card.kind === "number") return String(card.value ?? "");
  if (card.action === "skip") return "Ø";
  if (card.action === "reverse") return "⇄";
  if (card.action === "draw2") return "+2";
  if (card.action === "wild4") return "+4";
  return "W";
}

function cardClass(card: UnoCard, hidden = false): string {
  if (hidden) return "border-danfo bg-midnight text-danfo";
  if (card.color === "red") return "border-red-900 bg-red-800 text-bone";
  if (card.color === "yellow") return "border-yellow-500 bg-yellow-400 text-midnight";
  if (card.color === "green") return "border-green-900 bg-green-800 text-bone";
  if (card.color === "blue") return "border-blue-900 bg-blue-800 text-bone";
  return "border-danfo bg-midnight text-danfo";
}

function CardFace({ card, hidden = false, onClick }: { card: UnoCard; hidden?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      aria-label={hidden ? "Hidden UNO card" : `UNO ${cardLabel(card)}`}
      className={`relative flex h-32 w-20 shrink-0 flex-col items-center justify-center rounded-lg border-2 shadow-[0_8px_20px_rgb(0_0_0/0.35)] transition-transform ${cardClass(card, hidden)} ${onClick ? "cursor-pointer hover:-translate-y-2 active:translate-y-0" : ""}`}
    >
      <span className="font-display text-3xl font-black">{hidden ? "✦" : cardLabel(card)}</span>
      {!hidden ? <span className="mt-2 font-mono text-[8px] uppercase tracking-widest opacity-70">UNO</span> : null}
    </button>
  );
}

export function Uno() {
  const { user, isPending } = useCurrentUserState();
  const [roomId, setRoomId] = useState("");
  const [draftRoom, setDraftRoom] = useState("");
  const [client, setClient] = useState<ReturnType<typeof createRemoteUnoClient> | null>(null);
  const [snapshot, setSnapshot] = useState<UnoClientSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wildCard, setWildCard] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("room")?.trim() || "";
    setRoomId(id);
    setDraftRoom(id);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const next = createRemoteUnoClient(roomId);
    setClient(next);
    setSnapshot(next.getSnapshot());
    const unsubscribe = next.subscribe(setSnapshot);
    return () => {
      void next.leave().catch(() => undefined);
      next.dispose();
    };
  }, [roomId]);

  const self = snapshot?.players.find((player) => player.id === snapshot.selfId);
  const view = snapshot?.view;
  const hand = useMemo(() => view?.players.find((player) => player.id === snapshot?.selfId)?.hand ?? [], [view, snapshot?.selfId]);
  const myTurn = !!view && view.players[view.currentPlayer]?.id === snapshot?.selfId;

  const action = async (fn: () => Promise<UnoClientSnapshot>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (err) { setError(err instanceof Error ? err.message : "UNO action failed."); } finally { setBusy(false); }
  };

  if (isPending) return <GameShell game={game}><div className="p-8 font-mono text-xs uppercase tracking-widest text-concrete">Checking the door…</div></GameShell>;
  if (!user) return <GameShell game={game}><div className="mx-auto max-w-xl p-8"><h2 className="font-display text-4xl font-black uppercase">Sign in first.</h2><p className="mt-3 text-sm text-concrete">Online UNO is authenticated so nobody can impersonate another player.</p></div></GameShell>;

  if (!roomId || !client) {
    return (
      <GameShell game={game}>
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5 p-6 md:p-10">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.25em] text-danfo">Authoritative multiplayer</p><h1 className="mt-2 font-display text-5xl font-black uppercase leading-none">UNO. No fake wins.</h1><p className="mt-3 text-sm text-concrete">Create a room name and send the same link to your people.</p></div>
          <input value={draftRoom} onChange={(event) => setDraftRoom(event.target.value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32))} placeholder="ROOM NAME" aria-label="UNO room name" className="h-14 border border-lane bg-midnight px-4 font-mono text-sm uppercase text-bone outline-none focus:border-danfo" />
          <Button disabled={!draftRoom.trim()} onClick={() => { const id = draftRoom.trim(); window.history.replaceState({}, "", `${window.location.pathname}?room=${encodeURIComponent(id)}`); setRoomId(id); }}>Enter room</Button>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell game={game} status={<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-concrete">ROOM · {roomId}</p>}>
      <div className="flex flex-1 flex-col gap-5 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lane pb-4">
          <div><p className="font-display text-2xl font-black uppercase">{snapshot?.phase ?? "CONNECTING"}</p><p className="font-mono text-[10px] uppercase tracking-widest text-concrete">{snapshot?.players.length ?? 0} players · {self?.host ? "host" : "player"}</p></div>
          <div className="flex gap-2">
            {self && (snapshot?.phase === "WAITING" || snapshot?.phase === "READY") ? <Button disabled={busy} variant={self.ready ? "outline" : "default"} onClick={() => void action(() => client.ready(!self.ready))}>{self.ready ? "Unready" : "Ready"}</Button> : null}
            {self?.host && snapshot?.phase === "READY" ? <Button disabled={busy} onClick={() => void action(() => client.start())}>Start game</Button> : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {(snapshot?.players ?? []).map((player) => <div key={player.id} className={`border p-3 ${player.id === snapshot?.selfId ? "border-danfo" : "border-lane"}`}><p className="truncate font-display font-bold uppercase">{player.name}{player.host ? " ★" : ""}</p><p className="font-mono text-[10px] uppercase tracking-widest text-concrete">{player.ready ? "READY" : "NOT READY"} · {player.connected ? "ONLINE" : "RECONNECTING"}</p>{view ? <p className="mt-1 font-mono text-[10px] text-concrete">{view.players.find((p) => p.id === player.id)?.handCount ?? 0} cards</p> : null}</div>)}
        </div>

        {snapshot?.phase === "WAITING" || snapshot?.phase === "READY" ? (
          <div className="flex min-h-48 flex-1 items-center justify-center border border-dashed border-lane p-8 text-center"><div><p className="font-display text-4xl font-black uppercase">Take your seat.</p><p className="mt-2 text-sm text-concrete">Everyone ready? Host starts the real game.</p></div></div>
        ) : (
          <>
            <div className="flex flex-1 items-center justify-center gap-4 py-4">{view?.discardPile.at(-1) ? <CardFace card={view.discardPile.at(-1)!} /> : null}<div className="font-mono text-xs uppercase text-concrete">{view?.drawPileCount ?? 0} in deck</div></div>
            <div className="flex items-center justify-between gap-3"><div className="flex gap-2"><Button disabled={busy || !myTurn || !!view?.winner} onClick={() => void action(() => client.draw())}>Draw</Button><Button disabled={busy || !view || view.players.find((p) => p.id === snapshot.selfId)?.handCount !== 2} variant="outline" onClick={() => void action(() => client.callUno())}>UNO!</Button></div><p className="font-mono text-[10px] uppercase tracking-widest text-concrete">{view?.winner ? `Winner: ${view.winner}` : myTurn ? "Your turn" : "Opponent's turn"}</p></div>
            <div className="flex gap-2 overflow-x-auto pb-2">{hand.map((card) => { const isWild = card.action === "wild" || card.action === "wild4"; return <CardFace key={card.id} card={card} onClick={myTurn && !view?.winner ? () => { if (isWild) setWildCard(card.id); else void action(() => client.play(card.id)); } : undefined} />; })}</div>
          </>
        )}

        {wildCard ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/90 p-6"><div className="w-full max-w-sm border border-danfo bg-midnight p-6"><p className="font-display text-3xl font-black uppercase">Choose a color</p><div className="mt-5 grid grid-cols-2 gap-2">{COLORS.map((color) => <Button key={color} variant="outline" onClick={() => { const id = wildCard; setWildCard(null); void action(() => client.play(id, color)); }}>{color}</Button>)}</div></div></div> : null}
        {error || snapshot?.error ? <p role="alert" className="border border-danfo p-3 text-sm text-danfo">{error || snapshot?.error}</p> : null}
      </div>
    </GameShell>
  );
}
