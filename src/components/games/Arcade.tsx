"use client";

import { CruiseShell } from "@/components/cruise/CruiseShell";
import { CruisePlayerCard } from "@/components/cruise/CruiseUI";
import { WeeklyTheme } from "@/components/cruise/WeeklyTheme";
import { GAMES, type GameSlug } from "@/lib/games/catalog";
import { sfx } from "@/lib/games/audio";
import { playIf, usePlayer } from "@/lib/games/player";
import { Link } from "@tanstack/react-router";
import {
  Castle,
  Dices,
  Flame,
  LayoutGrid,
  Layers,
  Mic,
  Moon,
  PenLine,
  Type,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  codenames: LayoutGrid,
  "word-guess": Type,
  draw: PenLine,
  uno: Layers,
  ludo: Dices,
  werewolf: Moon,
  chess: Castle,
  karaoke: Mic,
  truth: Flame,
  kahoot: Zap,
};

export function Arcade() {
  const muted = usePlayer((s) => s.muted);
  const recent = usePlayer((s) => s.recent);
  const stats = usePlayer((s) => s.stats);
  const recentGames = recent.map((slug) => GAMES.find((g) => g.slug === slug)).filter(Boolean);

  return (
    <CruiseShell compact>
      <section className="flex items-center justify-between gap-3 px-4 pb-3 pt-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-danfo">Play</p>
          <h1 className="font-display text-2xl font-bold uppercase leading-none tracking-tight">Sit down</h1>
        </div>
        <div className="w-[11.5rem] shrink-0">
          <CruisePlayerCard compact />
        </div>
      </section>

      <WeeklyTheme compact />

      {recentGames.length ? (
        <section className="px-4 pb-3">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
            {recentGames.map((g) =>
              g ? (
                <Link
                  key={g.slug}
                  to="/play/$slug"
                  params={{ slug: g.slug }}
                  onClick={() => playIf(muted, sfx.tap)}
                  className="inline-flex min-h-11 shrink-0 items-center border border-lane px-3 font-display text-sm font-bold uppercase tracking-[0.12em]"
                  style={{ color: g.accent }}
                >
                  {g.name}
                  <span className="ml-2 font-mono text-[10px] text-concrete">
                    {stats[g.slug as GameSlug]?.played ?? 0}
                  </span>
                </Link>
              ) : null,
            )}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-px bg-lane pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:grid-cols-3 lg:grid-cols-5">
        {GAMES.map((g) => {
          const Icon = ICONS[g.slug];
          return (
            <Link
              key={g.slug}
              to="/play/$slug"
              params={{ slug: g.slug }}
              onClick={() => playIf(muted, sfx.tap)}
              className="group relative flex min-h-[148px] flex-col justify-between overflow-hidden bg-midnight p-3 active:bg-asphalt sm:min-h-[180px] sm:p-4"
            >
              <div className="pointer-events-none absolute -right-4 -top-4 size-16 opacity-20" style={{ color: g.accent }}>
                {Icon ? <Icon className="size-full" strokeWidth={1.2} /> : null}
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-concrete">{g.players}</span>
              <div>
                <h2 className="font-display text-xl font-bold uppercase leading-none tracking-tight" style={{ color: g.accent }}>
                  {g.name}
                </h2>
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-bone/70">{g.line}</p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-danfo">Play</span>
            </Link>
          );
        })}
      </section>
    </CruiseShell>
  );
}
