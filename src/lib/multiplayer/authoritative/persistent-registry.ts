import { getSql } from "@/lib/db";
import { UnoRoom, type UnoRoomSnapshot } from "./uno-room";
import { getUnoRoom, getOrCreateUnoRoom } from "./registry";

function validRoomId(roomId: string): string {
  const id = roomId.trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw new Error("Invalid room id.");
  return id;
}

export async function hydrateUnoRoom(roomId: string): Promise<UnoRoom> {
  const id = validRoomId(roomId);
  const cached = getUnoRoom(id);
  if (cached) return cached;

  const sql = await getSql();
  const rows = await sql.query<{ snapshot: UnoRoomSnapshot }>(
    "select snapshot from uno_rooms where room_id = $1",
    [id],
  );
  if (rows[0]?.snapshot) {
    const room = UnoRoom.fromSnapshot(rows[0].snapshot);
    // Reuse the normal process cache after restoring durable state.
    const cachedRoom = getOrCreateUnoRoom(id);
    if (cachedRoom.phase === "WAITING" && cachedRoom.getPlayers().length === 0) {
      return replaceCachedRoom(id, room);
    }
    return cachedRoom;
  }

  const room = getOrCreateUnoRoom(id);
  await saveUnoRoom(room);
  return room;
}

function replaceCachedRoom(roomId: string, room: UnoRoom): UnoRoom {
  const globalRef = globalThis as typeof globalThis & { __bchUnoRooms__?: Map<string, UnoRoom> };
  globalRef.__bchUnoRooms__ ??= new Map();
  globalRef.__bchUnoRooms__.set(roomId, room);
  return room;
}

export async function saveUnoRoom(room: UnoRoom): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into uno_rooms (room_id, snapshot, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (room_id) do update set snapshot = excluded.snapshot, updated_at = now()`,
    [room.roomId, JSON.stringify(room.snapshot())],
  );
}
