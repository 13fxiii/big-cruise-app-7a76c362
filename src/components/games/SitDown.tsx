"use client";

import { Spark } from "@/components/brand/marks";
import { CruiseButton } from "@/components/cruise/CruiseUI";
import { type GameMeta, type GameMode, roomCode } from "@/lib/games/catalog";
import { sfx } from "@/lib/games/audio";
import { playIf, usePlayer } from "@/lib/games/player";
import { AccentBar, ModeChip } from "./Shell";
import { useState } from "react";

export type SitDownStart = {
  mode: GameMode;
  room: string;
  seats: number;
  joining: boolean;
};

function seatRange(label: string, fallbackMin: number, fallbackMax: number) {
  const match = label.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!match) return { min: fallbackMin, max: fallbackMax };
  return { min: Number(match[1]), max: Number(match[2]) };
}

export function SitDown({
  game,
  defaultSeats,
  minSeats = 1,
  maxSeats = 4,
  onStart,
}: {
  game: GameMeta;
  defaultSeats: number;
  minSeats?: number;
  maxSeats?: number;
  onStart: (opts: SitDownStart) => void;
}) {
  const { min, max } = seatRange(game.players, minSeats, maxSeats);
  const name = usePlayer((s) => s.name);
  const setName = usePlayer((s) => s.setName);
  const muted = usePlayer((s) => s.muted);
  const recordPlay = usePlayer((s) => s.recordPlay);
  const cruiseId = usePlayer((s) => s.cruiseId);
  const [mode, setMode] = useState<GameMode>(game.modes[0]);
  const [seats, setSeats] = useState(() => Math.min(max, Math.max(min, defaultSeats)));
  const [join, setJoin] = useState("");
  const [hostCode] = useState(() => roomCode());

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-5 py-10">
      <div>
        <AccentBar color={game.accent} />
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-concrete">
          Sit down · {game.players}
        </p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight md:text-6xl">
          {game.name}
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-bone/80">{game.blurb}</p>
        <p className="mt-2 font-display text-lg uppercase tracking-[0.12em] text-danfo">{game.line}</p>
      </div>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-concrete">Your name in the room</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 h-12 w-full border border-lane bg-asphalt px-4 font-display text-2xl font-bold uppercase tracking-[0.08em] text-bone outline-none focus:border-danfo"
          maxLength={18}
        />
        <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-concrete">{cruiseId}</span>
      </label>

      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-concrete">How we play</p>
        <div className="flex flex-wrap gap-2">
          {game.modes.includes("bots") ? (
            <ModeChip active={mode === "bots"} onClick={() => setMode("bots")}>
              Vs bots
            </ModeChip>
          ) : null}
          {game.modes.includes("pass") ? (
            <ModeChip active={mode === "pass"} onClick={() => setMode("pass")}>
              Pass the phone
            </ModeChip>
          ) : null}
          {game.modes.includes("online") ? (
            <ModeChip active={mode === "online"} onClick={() => setMode("online")}>
              Cruise room
            </ModeChip>
          ) : null}
        </div>
        <p className="mt-3 border-l-2 border-danfo pl-3 text-sm text-bone/75" aria-live="polite">
          Selected: <span className="font-bold text-danfo">{mode === "bots" ? "Vs bots" : mode === "pass" ? "Pass the phone" : "Cruise room"}</span>.
          {mode === "online" ? " Host a room or enter a code below." : " Tap Sit down to start."}
        </p>
      </div>

      {mode !== "online" && max > min ? (
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-concrete">
            Seats · {seats}
          </p>
          {max - min > 8 ? (
            <input
              type="range"
              min={min}
              max={max}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="w-full accent-danfo"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
                <ModeChip key={n} active={seats === n} onClick={() => setSeats(n)}>
                  {n}
                </ModeChip>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {mode === "online" ? (
        <div className="space-y-4 border border-lane bg-asphalt p-5">
          <div className="flex items-center gap-3">
            <Spark className="size-8 text-danfo" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-concrete">Host code</p>
              <p className="font-display text-4xl font-bold tracking-[0.2em] text-danfo">{hostCode}</p>
            </div>
          </div>
          <p className="text-sm text-concrete">Share that code. Fam join from the same game page.</p>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-concrete">Or join a room</span>
            <input
              value={join}
              onChange={(e) => setJoin(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="CODE"
              className="mt-2 h-12 w-full border border-lane bg-midnight px-4 font-display text-2xl font-bold tracking-[0.28em] text-danfo outline-none focus:border-danfo"
            />
          </label>
        </div>
      ) : null}

      <CruiseButton
        onClick={() => {
          playIf(muted, sfx.play);
          const joining = mode === "online" && join.length === 4;
          // Enter the table first so a telemetry/RPC failure cannot block gameplay.
          onStart({
            mode,
            room: joining ? join : hostCode,
            seats,
            joining,
          });
          try {
            recordPlay(game.slug, mode === "online" && !joining);
          } catch {
            /* local identity is optional at sit-down */
          }
        }}
      >
        Sit down
      </CruiseButton>
    </div>
  );
}
