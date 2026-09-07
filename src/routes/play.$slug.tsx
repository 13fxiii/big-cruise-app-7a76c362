import { createFileRoute } from "@tanstack/react-router";
import { getGame } from "@/lib/games/catalog";
import { Spark } from "@/components/brand/marks";
import { Codenames } from "@/components/games/codenames/Codenames";
import { WordGuess } from "@/components/games/wordguess/WordGuess";
import { DrawItOut } from "@/components/games/draw/DrawItOut";
import { Uno } from "@/components/games/uno/Uno";
import { Ludo } from "@/components/games/ludo/Ludo";
import { Werewolf } from "@/components/games/werewolf/Werewolf";
import { ChessGame } from "@/components/games/chess/ChessGame";
import { Karaoke } from "@/components/games/karaoke/Karaoke";
import { TruthOrDare } from "@/components/games/truth/TruthOrDare";
import { Kahoot } from "@/components/games/kahoot/Kahoot";
import type { GameSlug } from "@/lib/games/catalog";
import type { ComponentType } from "react";

const VIEWS: Record<GameSlug, ComponentType> = {
  codenames: Codenames,
  "word-guess": WordGuess,
  draw: DrawItOut,
  uno: Uno,
  ludo: Ludo,
  werewolf: Werewolf,
  chess: ChessGame,
  karaoke: Karaoke,
  truth: TruthOrDare,
  kahoot: Kahoot,
};

const ALIASES: Record<string, GameSlug> = {
  "draw-it-out": "draw",
  "truth-or-dare": "truth",
};

export const Route = createFileRoute("/play/$slug")({
  beforeLoad: ({ params }) => {
    const canonical = ALIASES[params.slug];
    if (canonical) {
      throw redirect({
        to: "/play/$slug",
        params: { slug: canonical },
        replace: true,
      });
    }
  },
  component: Play,
});

function Play() {
  const { slug } = Route.useParams();
  const game = getGame(slug);
  const View = game ? VIEWS[game.slug] : null;
  if (!game || !View) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-midnight px-6 text-bone">
        <Spark className="size-16 text-danfo" />
        <p className="font-display text-4xl font-bold uppercase">That room is closed.</p>
        <a href="/play" className="font-display text-sm font-bold uppercase tracking-[0.16em] text-danfo">
          Back to the arcade
        </a>
      </div>
    );
  }
  return <View />;
}
import { redirect } from "@tanstack/react-router";
