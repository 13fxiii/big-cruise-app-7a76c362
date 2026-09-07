# BIG CRUISE〽️ Game Architecture

## Decision

BIG CRUISE uses **Supabase for identity, profiles, statistics, rewards, and commerce**. A future authoritative multiplayer service will own live room state, turn validation, reconnection, and private information. The first candidate is Colyseus, but it is not added to the Vercel web runtime until a dedicated server deployment and room protocol are approved.

The client must never be the source of truth for wins, rewards, hidden roles, secret words, card legality, inventory, or payment state.

## Phased build order

1. **Foundation:** room identity, typed commands, authoritative state snapshots, reconnect and rate-limit boundaries.
2. **UNO:** card legality, turn order, draw and discard piles, wild colors, UNO calls, and server-safe public state.
3. **Ludo:** dice, token movement, captures, safe squares, home, and winner state.
4. **Werewolf:** private roles, night/day phases, actions, voting, elimination, and win conditions.
5. **Draw It Out:** server-held secret word and authoritative canvas event stream.
6. **Codenames:** private spymaster view, team turns, board reveal, and scoring.
7. **Truth or Dare and Quiz:** content validation, timers, answers, scoring, and moderation controls.
8. **Karaoke:** Spotify catalog/search integration only after OAuth, playback restrictions, and licensing boundaries are confirmed.
9. **Word Guess and Chess:** curated word validation and `chess.js` move validation with authoritative room state.

## Current implementation

`src/lib/games/uno.ts` is the first rules-engine slice. It is deterministic when supplied an RNG, validates commands on the state owner, supports draw-two stacking, wild color declarations, UNO calls, win detection, and hides other players' hands through `publicUnoState`.

The engine is deliberately transport-neutral. A Colyseus room, Supabase Edge Function, or another approved authoritative server can wrap it later without changing the rules contract. No external game API or copied proprietary asset is required for the UNO foundation.

## External-service boundaries

- **Colyseus:** candidate live-room transport and state synchronization layer; not installed or deployed yet.
- **Supabase:** account, profile, BIG CRUISE ID, stats, rewards, and durable history.
- **Spotify:** optional karaoke catalog/playback integration; requires approved credentials and platform-compliant playback.
- **Kahoot:** gameplay is not embedded; BIG CRUISE implements its own quiz mechanics.
- **Chess.js:** planned legal-move validator for the Chess phase.
