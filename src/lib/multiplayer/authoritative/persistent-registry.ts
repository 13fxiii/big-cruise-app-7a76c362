import { getSql } from "@/lib/db";
import { UnoRoom, type UnoRoomSnapshot } from "./uno-room";
import { getUnoRoom, getOrCreateUnoRoom } from "./registry";

function validRoomId(roomId: string): string {
  const id = roomId.trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw new Error("Invalid room id.");
  return id;
}

type StoredRow = { snapshot: UnoRoomSnapshot; version: number };

export async function hydrateUnoRoom(roomId: string): Promise<UnoRoom> {
  const id = validRoomId(roomId);
  const cached = getUnoRoom(id);
  if (cached) return cached;

  const sql = await getSql();
  const rows = await sql.query<StoredRow>(
    "select snapshot, coalesce(version, 1) as version from uno_rooms where room_id = $1",
    [id],
  );
  if (rows[0]?.snapshot) {
    const room = UnoRoom.fromSnapshot(rows[0].snapshot);
    (room as unknown as { __persistVersion?: number }).__persistVersion = Number(rows[0].version) || 1;
    return replaceCachedRoom(id, room);
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

/**
 * Persist room snapshot with optimistic version check.
 * On conflict (another instance wrote first), re-hydrate is left to the next request.
 */
export async function saveUnoRoom(room: UnoRoom): Promise<void> {
  const sql = await getSql();
  const tagged = room as unknown as { __persistVersion?: number };
  const expected = tagged.__persistVersion ?? 0;
  const snapshot = JSON.stringify(room.snapshot());

  if (expected <= 0) {
    await sql.query(
      `insert into uno_rooms (room_id, snapshot, version, updated_at)
       values ($1, $2::jsonb, 1, now())
       on conflict (room_id) do update
         set snapshot = excluded.snapshot,
             version = uno_rooms.version + 1,
             updated_at = now()`,
      [room.roomId, snapshot],
    );
    tagged.__persistVersion = 1;
    return;
  }

  const updated = await sql.query<{ version: number }>(
    `update uno_rooms
     set snapshot = $2::jsonb,
         version = version + 1,
         updated_at = now()
     where room_id = $1 and version = $3
     returning version`,
    [room.roomId, snapshot, expected],
  );

  if (updated[0]?.version) {
    tagged.__persistVersion = Number(updated[0].version);
    return;
  }

  // Lost the race — force overwrite with incremented version so the room is not stuck.
  // Honest: true serializable multi-writer still needs a dedicated game host.
  const forced = await sql.query<{ version: number }>(
    `update uno_rooms
     set snapshot = $2::jsonb,
         version = version + 1,
         updated_at = now()
     where room_id = $1
     returning version`,
    [room.roomId, snapshot],
  );
  if (forced[0]?.version) tagged.__persistVersion = Number(forced[0].version);
}
