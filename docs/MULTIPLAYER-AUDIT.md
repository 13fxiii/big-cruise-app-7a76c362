# BIG CRUISE — Multiplayer architecture audit (Release 1)

Date: 2026-09-07  
Scope: existing P2P stack vs authoritative server for UNO  
Production baseline: `60a70b8` (+ UNO Sourcery fixes on main)

## 1. What exists today

| Layer | Path | Role |
|---|---|---|
| Full-mesh WebRTC | `src/lib/multiplayer/p2p.ts` | One `RTCPeerConnection` per remote peer; game data on data channels |
| Signaling | `src/lib/multiplayer/signaling.server.ts` + `/api/rtc` | Poll/POST offer/answer/ICE; Postgres `webrtc_*` or process memory fallback |
| React bind | `use-p2p-room.ts` | Reactive join when `enabled` + room code |
| Protocol | `protocol.ts` | `hello` / `snap` / `act` packets |
| Game room | `use-game-room.ts` | Host pushes snapshots; peers apply; actions broadcast |
| Online helper | `use-online-snap.ts` | Host republishes when peer count changes |
| Lobby codes | `SitDown.tsx` | 4-letter room codes; modes include `online` |
| Sample rooms | `src/lib/cruise/rooms.ts` | **Sample/fixture only** — not live matchmaking |
| UNO rules | `src/lib/games/uno.ts` | Transport-neutral, tested engine with `publicUnoState` |
| UNO UI | `src/components/games/uno/Uno.tsx` | **Local deck + local rules** — does not call `uno.ts` yet |

### Runtime behaviour (P2P)

1. Client generates random `selfId` (`p-xxxxxxxx`) — **not** Supabase user id.
2. `join()` polls `/api/rtc`, registers peer, discovers roster.
3. Higher id dials lower id (full mesh).
4. STUN only by default (Google + Cloudflare). **No TURN** unless env provides it → many mobile/cellular meshes never connect.
5. Host (`joining === false`) is sole publisher of `snap` payloads.
6. Guests apply whatever snapshot the host sends.
7. Recovery: stalled peers retry a few times; host leave ends authority with no election.

## 2. Security & authority gaps

| Concern | Current P2P | Required for UNO |
|---|---|---|
| Private hands | Host holds/sees full state if they implement it client-side | Server-only hands; per-viewer views |
| Move legality | Client / host can accept anything | Server validates via `uno.ts` |
| Identity | Spoofable peer id | Bound to Supabase session |
| “I won” | Client can publish winner snap | Server sets `winner` only |
| Deck order | Client shuffle | Server shuffle |
| Host disconnect | Game stuck | Server continues or graceful close |
| Cheat draw pile | `publicUnoState` fixed (count only) | Must never re-expose pile on wire |

**Conclusion:** Host-authoritative P2P is acceptable for *public* boards (e.g. shared FEN) as a convenience mesh. It is **not** acceptable as the sole authority for UNO (hidden cards, rewards, anti-cheat).

## 3. P2P vs authoritative server

| Axis | Current P2P | Authoritative server (e.g. Colyseus room) |
|---|---|---|
| Cheating resistance | Weak (host is god) | Strong (server validates) |
| Private state | Hard / leak-prone | Natural (per-client views) |
| Reconnect | Partial (ICE recovery) | Room session + reserved seats |
| Mobile NAT | Needs TURN | Single server connection; more reliable |
| Scale | O(n²) mesh | O(n) client↔server |
| Latency | Low when direct | One hop; predictable |
| Deploy | Fits Vercel + `/api/rtc` | Needs **persistent** process (not serverless) |
| Ops | Simple | Extra service (Fly/Railway/Render/…) |
| Fit with `uno.ts` | Engine unused by UI | Engine is the room core |

## 4. Decision

**Hybrid — retain P2P, do not trust it for UNO authority.**

1. **Keep** existing P2P code paths for current online sit-down / public-state games. Do not delete.
2. **Introduce** a transport abstraction so UI does not hard-code P2P.
3. **Introduce** an in-repo **authoritative UNO room** (`UnoRoom`) that owns state via `src/lib/games/uno.ts` and emits per-player public views.
4. **Defer Colyseus package install** until a persistent host is provisioned. Colyseus remains the preferred *production* host for `UnoRoom` (matchmaking, schema sync, reconnection helpers) — not required to prove rules authority in unit tests.
5. Supabase stays identity + durable stats; **not** per-turn game state.

Rationale: smallest change that satisfies “server owns cards/turns/winner” without ripping out working Sit Down / WebRTC signaling or forcing a WebSocket server into Vercel serverless.

## 5. Target architecture

```
UNO UI (Big Cruise)
        │
        ▼
  GameTransport interface
   ├── P2pTransport (existing mesh — public snaps)
   └── AuthoritativeTransport (UnoRoom adapter → future Colyseus/WS host)
        │
        ▼
   UnoRoom (authoritative)
        │
        ▼
   src/lib/games/uno.ts  (rules + publicUnoState)
        │
        ▼
   Supabase (match result, BCH, profile stats) — end of match only
```

## 6. Room lifecycle (authoritative)

`WAITING → READY → PLAYING → FINISHED → (REMATCH) → CLOSED`

Players: `userId`, `displayName`, `seat`, `ready`, `connected`, `host`.

## 7. Non-goals for this slice

- No Ludo multiplayer yet
- No X OAuth
- No Spaces
- No rewrite of TanStack Start
- No destruction of P2P module
