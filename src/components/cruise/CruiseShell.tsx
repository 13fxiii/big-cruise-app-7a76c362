"use client";

import { LiveMark, Spark, Wordmark } from "@/components/brand/marks";
import { CruiseBackground, type CruiseDensity } from "@/components/cruise/CruiseBackground";
import { CruiseLoader } from "@/components/cruise/CruiseLoader";
import { CruiseAvatar, CruiseModal, CruiseToastRack } from "@/components/cruise/CruiseUI";
import { signOut } from "@/lib/auth/client";
import { usePlayer } from "@/lib/games/player";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Disc3, Gamepad2, LogOut, MoreHorizontal, ShoppingBag, UserRound } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

const PRIMARY = [
  { to: "/play", label: "Play", icon: Gamepad2 },
  { to: "/merch", label: "Merch", icon: ShoppingBag },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/settings", label: "More", icon: MoreHorizontal },
] as const;

const MORE = [
  { to: "/music", label: "Music", icon: Disc3 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/rewards", label: "Rewards" },
  { to: "/brand", label: "Brand" },
] as const;

function useHydratePlayer() {
  const hydrate = usePlayer((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
}

export function CruiseHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const name = usePlayer((s) => s.name);
  const [more, setMore] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSignOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="relative z-20 flex items-center gap-3 border-b border-lane/80 bg-midnight/80 px-3 py-2 backdrop-blur-md md:px-8 md:py-3">
        <Link to="/" className="flex min-h-11 items-center gap-3" aria-label="Home">
          <LiveMark className="size-10 text-danfo" />
          <Wordmark className="hidden text-xl text-bone sm:inline" compact spark={false} />
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {PRIMARY.map((item) => {
            const active =
              item.to === "/play" ? pathname === "/play" || pathname.startsWith("/play/") : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex min-h-11 items-center px-3 font-display text-sm font-bold uppercase tracking-[0.16em] transition-colors duration-150",
                  active ? "text-danfo" : "text-bone/70 hover:text-bone",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link to="/profile" className="ml-2">
            <CruiseAvatar name={name} size="sm" />
            <span className="sr-only">Profile</span>
          </Link>
        </nav>
        <Link to="/profile" className="ml-auto md:hidden">
          <CruiseAvatar name={name} size="sm" />
          <span className="sr-only">Profile</span>
        </Link>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-lane bg-midnight/92 backdrop-blur-md md:hidden safe-bottom">
        {PRIMARY.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === "/play" ? pathname === "/play" || pathname.startsWith("/play/") : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 font-mono text-[9px] uppercase tracking-[0.16em]",
                active ? "text-danfo" : "text-concrete",
              )}
            >
              <Icon className="size-5" strokeWidth={1.6} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <CruiseModal open={more} onClose={() => setMore(false)} title="More">
        <div className="grid gap-1">
          {MORE.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMore(false)}
              className="flex min-h-12 items-center justify-between border-b border-lane font-display text-lg font-bold uppercase tracking-[0.1em] text-bone hover:text-danfo"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={loggingOut}
          className="mt-4 flex min-h-12 w-full items-center gap-3 border-t border-lane pt-4 font-display text-lg font-bold uppercase tracking-[0.1em] text-bone transition-colors hover:text-danfo disabled:cursor-wait disabled:opacity-60"
        >
          <LogOut className="size-5" strokeWidth={1.8} />
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </CruiseModal>
    </>
  );
}

function HouseFloor() {
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 px-5 py-8 md:px-10">
      <Spark className="size-6 text-danfo" />
    </footer>
  );
}

export function CruiseShell({
  children,
  density = "default",
  accent,
  boot = false,
  compact = false,
}: {
  children: ReactNode;
  density?: CruiseDensity;
  accent?: string;
  boot?: boolean;
  compact?: boolean;
}) {
  useHydratePlayer();
  return (
    <div className="relative min-h-dvh bg-midnight text-bone">
      <CruiseBackground density={density} accent={accent} position="fixed" />
      {boot ? <CruiseLoader /> : null}
      <div className="relative z-10 flex min-h-dvh flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <CruiseHeader />
        <div className="flex-1">{children}</div>
        {compact ? null : (
          <div className="hidden md:block">
            <HouseFloor />
          </div>
        )}
      </div>
      <CruiseToastRack />
    </div>
  );
}

export function CruisePage({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <CruiseShell>
      <div className="px-4 py-5 md:px-10 md:py-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-danfo">{kicker}</p>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase leading-none tracking-tight md:text-5xl">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </CruiseShell>
  );
}

export function CruiseGameRoom({
  children,
  accent,
}: {
  children: ReactNode;
  accent?: string;
}) {
  useHydratePlayer();
  return (
    <div className="relative min-h-dvh bg-midnight text-bone">
      <CruiseBackground density="game" accent={accent} position="fixed" />
      <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
      <CruiseToastRack />
    </div>
  );
}
