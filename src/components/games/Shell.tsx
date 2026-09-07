"use client";

import { Spark } from "@/components/brand/marks";
import { CruiseGameRoom } from "@/components/cruise/CruiseShell";
import { CruiseAvatar } from "@/components/cruise/CruiseUI";
import { type GameMeta } from "@/lib/games/catalog";
import { usePlayer } from "@/lib/games/player";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { type ReactNode, useEffect } from "react";

export function GameShell({
  game,
  status,
  children,
}: {
  game: GameMeta;
  status?: ReactNode;
  children: ReactNode;
}) {
  const name = usePlayer((s) => s.name);
  const muted = usePlayer((s) => s.muted);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const hydrate = usePlayer((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <CruiseGameRoom accent={game.accent}>
      <header className="flex items-center gap-3 border-b border-lane px-4 py-3 md:px-6">
        <Link
          to="/"
          className="inline-flex size-11 items-center justify-center border border-lane text-bone transition-colors hover:border-danfo hover:text-danfo"
          aria-label="Back to Game Room"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Spark className="size-8 text-danfo" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold uppercase leading-none tracking-[0.12em] md:text-2xl">
            {game.name}
          </p>
          <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-concrete">
            {game.day} · {game.feel}
          </p>
        </div>
        {status ? <div className="hidden sm:block">{status}</div> : null}
        <div className="hidden items-center gap-2 sm:flex">
          <CruiseAvatar name={name} size="sm" />
          <span className="max-w-[8rem] truncate font-mono text-[10px] uppercase tracking-widest text-concrete">
            {name}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleMute}
          className="inline-flex size-11 items-center justify-center border border-lane text-bone hover:border-danfo hover:text-danfo"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
      </header>
      <div className="sm:hidden">{status ? <div className="border-b border-lane px-4 py-2">{status}</div> : null}</div>
      <main className="flex flex-1 flex-col">{children}</main>
    </CruiseGameRoom>
  );
}

export function AccentBar({ color }: { color: string }) {
  return <span className="inline-block h-0.5 w-10 origin-left -rotate-[8deg]" style={{ background: color }} />;
}

export function ModeChip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-11 border px-4 font-display text-sm font-bold uppercase tracking-[0.16em] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danfo",
        active
          ? "border-danfo bg-danfo text-midnight shadow-[0_0_0_2px_rgba(255,241,0,0.2)]"
          : "border-lane bg-transparent text-bone hover:border-danfo",
      )}
    >
      {children}
    </button>
  );
}
