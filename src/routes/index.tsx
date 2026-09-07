"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { CruiseShell } from "@/components/cruise/CruiseShell";
import { WeeklyTheme } from "@/components/cruise/WeeklyTheme";
import { Gamepad2, MoreHorizontal, ShoppingBag, UserRound } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

const TILES = [
  { to: "/play", label: "Play", icon: Gamepad2 },
  { to: "/merch", label: "Merch", icon: ShoppingBag },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/settings", label: "More", icon: MoreHorizontal },
] as const;

function Home() {
  return (
    <CruiseShell compact>
      <div className="grid min-h-[calc(100dvh-7rem)] grid-cols-2 gap-px bg-lane">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="flex min-h-[40dvh] flex-col items-center justify-center gap-4 bg-midnight active:bg-asphalt"
            >
              <Icon className="size-10 text-danfo" strokeWidth={1.4} />
              <span className="font-display text-2xl font-bold uppercase tracking-[0.12em]">{t.label}</span>
            </Link>
          );
        })}
      </div>
      <WeeklyTheme />
    </CruiseShell>
  );
}
