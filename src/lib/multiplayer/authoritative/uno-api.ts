/** Shared request handlers for /api/uno-room. Identity always comes from the validated Supabase bearer. */
import { UnauthorizedError } from "@/lib/auth/verify.server";
import { resolveMultiplayerIdentity, IdentityError } from "@/lib/multiplayer/identity";
import { hydrateUnoRoom, saveUnoRoom } from "./persistent-registry";
import type { UnoColor } from "@/lib/games/uno";
import type { UnoRoomCommand } from "./uno-room";

export type UnoApiBody = { op: "join" | "leave" | "ready" | "start" | "play" | "draw" | "call_uno" | "rematch" | "close" | "state"; roomId: string; name?: string; ready?: boolean; cardId?: string; color?: UnoColor; claimedUserId?: string };
function json(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } }); }

export async function handleUnoRoomRequest(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") {
      const roomId = new URL(request.url).searchParams.get("roomId")?.trim();
      if (!roomId) return json({ error: "roomId required" }, 400);
      const identity = await resolveMultiplayerIdentity({ bearerToken: request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""), requireAuth: true });
      const room = await hydrateUnoRoom(roomId);
      return json({ phase: room.phase, players: room.getPlayers(), view: room.viewFor(identity.userId), selfId: identity.userId });
    }
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const body = (await request.json()) as UnoApiBody;
    if (!body?.roomId || !body?.op) return json({ error: "roomId and op required" }, 400);
    const identity = await resolveMultiplayerIdentity({ bearerToken: request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""), claimedUserId: body.claimedUserId, displayName: body.name, requireAuth: true });
    const room = await hydrateUnoRoom(body.roomId);
    const playerId = identity.userId;
    let cmd: UnoRoomCommand | null = null;
    switch (body.op) {
      case "state": break;
      case "join": cmd = { type: "join", playerId, name: identity.displayName }; break;
      case "leave": cmd = { type: "leave", playerId }; break;
      case "ready": cmd = { type: "ready", playerId, ready: Boolean(body.ready) }; break;
      case "start": cmd = { type: "start", playerId }; break;
      case "play": if (!body.cardId) return json({ error: "cardId required" }, 400); cmd = { type: "play", playerId, cardId: body.cardId, color: body.color }; break;
      case "draw": cmd = { type: "draw", playerId }; break;
      case "call_uno": cmd = { type: "call_uno", playerId }; break;
      case "rematch": cmd = { type: "rematch", playerId }; break;
      case "close": cmd = { type: "close", playerId }; break;
      default: return json({ error: "Unknown op" }, 400);
    }
    const error = cmd ? room.dispatch(cmd) : null;
    await saveUnoRoom(room);
    return json({ ok: !error, error: error || undefined, phase: room.phase, players: room.getPlayers(), view: room.viewFor(playerId), selfId: playerId });
  } catch (err) {
    if (err instanceof UnauthorizedError || (err instanceof IdentityError && err.code !== "forged_user_id")) return json({ error: err.message, code: err instanceof IdentityError ? err.code : "unauthorized" }, 401);
    if (err instanceof IdentityError) return json({ error: err.message, code: err.code }, 403);
    return json({ error: err instanceof Error ? err.message : "Server error" }, 400);
  }
}
