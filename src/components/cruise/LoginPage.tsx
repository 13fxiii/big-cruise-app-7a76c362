"use client";

import { LiveMark, Wordmark } from "@/components/brand/marks";
import { CruiseBackground } from "@/components/cruise/CruiseBackground";
import { CruiseButton, CruiseCard } from "@/components/cruise/CruiseUI";
import { authClient, authEnabled, GROK_PROVIDERS, signIn, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

type Mode = "signin" | "signup";

export function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await authClient.signUp.email({
          name: name.trim() || email.split("@")[0],
          email: email.trim().toLowerCase(),
          password,
        });
      } else {
        await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
        });
      }
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not go through.");
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh bg-midnight text-bone">
      <CruiseBackground density="default" position="fixed" />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
        <Link to="/" className="mb-8 flex items-center gap-3" aria-label="Game Room">
          <LiveMark className="size-10 text-danfo" />
          <Wordmark className="text-xl text-bone" compact />
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-danfo">Enter the house</p>
        <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.88] tracking-tight">
          {mode === "signup" ? "Get a seat." : "You are here."}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-bone/75">
          Email is the door. No X login. No API bill. Same identity across Game Room and BIG CRUISE ID.
        </p>

        {!authEnabled ? (
          <CruiseCard className="mt-8">
            <p className="font-display text-xl font-bold uppercase">Auth is parked.</p>
            <p className="mt-2 text-sm text-concrete">
              Flip `VITE_AUTH_ENABLED` off of false when this build is meant to hold real accounts.
            </p>
          </CruiseCard>
        ) : isPending ? (
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-concrete">Checking the door…</p>
        ) : user && !user.isDevFallback ? (
          <CruiseCard className="mt-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-concrete">Signed in</p>
            <p className="mt-2 font-display text-3xl font-bold uppercase">{user.displayName ?? "Member"}</p>
            <p className="mt-2 font-mono text-xs text-danfo">{user.primaryEmail}</p>
            <div className="mt-6 flex gap-3">
              <Link
                to="/"
                className="inline-flex min-h-11 items-center bg-danfo px-5 font-display text-lg font-bold uppercase tracking-[0.14em] text-midnight"
              >
                Game Room
              </Link>
              <CruiseButton variant="line" onClick={() => void signOut("/login")}>
                Sign out
              </CruiseButton>
            </div>
          </CruiseCard>
        ) : (
          <CruiseCard className="mt-8">
            <form onSubmit={onSubmit} className="grid gap-4">
              {mode === "signup" ? (
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-concrete">Display name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="mt-2 h-12 w-full border border-lane bg-midnight px-4 font-display text-xl font-bold uppercase tracking-[0.08em] text-bone outline-none focus:border-danfo"
                    maxLength={24}
                  />
                </label>
              ) : null}
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-concrete">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="mt-2 h-12 w-full border border-lane bg-midnight px-4 font-mono text-sm text-bone outline-none placeholder:text-concrete/50 focus:border-danfo"
                  placeholder="you@email.com"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-concrete">Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="mt-2 h-12 w-full border border-lane bg-midnight px-4 font-mono text-sm text-bone outline-none focus:border-danfo"
                />
              </label>
              {error ? <p className="text-sm text-danfo">{error}</p> : null}
              <CruiseButton type="submit" disabled={busy}>
                {busy ? "Hold on…" : mode === "signup" ? "Create seat" : "Walk in"}
              </CruiseButton>
            </form>

            <button
              type="button"
              className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-concrete hover:text-danfo"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
              }}
            >
              {mode === "signup" ? "Already have a seat? Walk in" : "New here? Create a seat"}
            </button>

            {GROK_PROVIDERS.length ? (
              <div className="mt-6 border-t border-lane pt-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-concrete">Or</p>
                <div className="grid gap-2">
                  {GROK_PROVIDERS.map((p) => (
                    <CruiseButton
                      key={p.providerId}
                      variant="line"
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        void signIn(p.providerId).catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Provider failed");
                          setBusy(false);
                        });
                      }}
                    >
                      Continue with {p.label}
                    </CruiseButton>
                  ))}
                </div>
              </div>
            ) : null}
          </CruiseCard>
        )}
      </div>
    </div>
  );
}
