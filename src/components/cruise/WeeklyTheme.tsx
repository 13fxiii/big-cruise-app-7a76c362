"use client";

import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GAMES, type GameSlug } from "@/lib/games/catalog";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/auth/supabase";

type WeeklyThemeRecord = {
  id: number;
  title: string;
  description: string;
  challenge: string | null;
  bch_reward: number;
  related_game: string | null;
  featured: string | null;
};

function canonicalGame(value: string | null): GameSlug | null {
  if (!value) return null;
  return GAMES.some((game) => game.slug === value) ? (value as GameSlug) : null;
}

export function WeeklyTheme({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<WeeklyThemeRecord | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      select: "id,title,description,challenge,bch_reward,related_game,featured",
      active: "eq.true",
      order: "start_date.desc",
      limit: "1",
    });

    fetch(`${SUPABASE_URL}/rest/v1/weekly_themes?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Weekly Theme unavailable");
        return (await response.json()) as WeeklyThemeRecord[];
      })
      .then((rows) => {
        if (!active) return;
        setTheme(rows[0] ?? null);
        setState(rows[0] ? "ready" : "empty");
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <section aria-label="Weekly Theme" className="border-y border-lane px-4 py-5 md:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-concrete">Weekly Theme</p>
        <p className="mt-2 text-sm text-concrete" aria-live="polite">Checking this week&apos;s challenge…</p>
      </section>
    );
  }

  if (state !== "ready" || !theme) {
    return (
      <section aria-label="Weekly Theme" className="border-y border-lane px-4 py-5 md:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-concrete">Weekly Theme</p>
        <p className="mt-2 text-sm text-concrete" aria-live="polite">
          {state === "empty" ? "No active theme yet. Check back soon." : "The weekly theme is taking a quick breather."}
        </p>
      </section>
    );
  }

  const game = canonicalGame(theme.related_game);

  return (
    <section aria-labelledby="weekly-theme-title" className="border-y border-danfo/60 bg-asphalt/70 px-4 py-5 md:px-10 md:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-danfo">Weekly Theme {theme.featured ? `· ${theme.featured}` : ""}</p>
          <h2 id="weekly-theme-title" className="mt-2 font-display text-3xl font-bold uppercase leading-none tracking-tight md:text-4xl">
            {theme.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-bone/80">{theme.description}</p>
          {theme.challenge ? <p className="mt-3 border-l-2 border-danfo pl-3 text-sm text-bone/90">Challenge: {theme.challenge}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <span className="border border-danfo px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-danfo">+{theme.bch_reward} BCH</span>
          {game ? (
            <Link
              to="/play/$slug"
              params={{ slug: game }}
              className="inline-flex min-h-11 items-center border border-bone px-4 font-display text-sm font-bold uppercase tracking-[0.16em] text-bone transition-colors hover:border-danfo hover:text-danfo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danfo"
            >
              Play {GAMES.find((item) => item.slug === game)?.name ?? "the game"}
            </Link>
          ) : null}
        </div>
      </div>
      {compact ? null : <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-concrete">Games first. The theme gives the room a reason to pull up.</p>}
    </section>
  );
}
