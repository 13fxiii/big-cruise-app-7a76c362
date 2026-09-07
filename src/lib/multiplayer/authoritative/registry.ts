/**
 * Process-local room registry for UnoRoom instances.
 * Suitable for a single Node process (preview / dedicated game host).
 * Not durable across serverless cold starts — document as such.
 */
import { UnoRoom } from "./uno-room";

const g = globalThis as typeof globalThis & {
  __bchUnoRooms__?: Map<string, UnoRoom>;
};

function map(): Map<string, UnoRoom> {
  g.__bchUnoRooms__ ??= new Map();
  return g.__bchUnoRooms__;
}

export function getOrCreateUnoRoom(roomId: string): UnoRoom {
  const rooms = map();
  let room = rooms.get(roomId);
  if (!room) {
    room = new UnoRoom({ roomId });
    rooms.set(roomId, room);
  }
  return room;
}

export function getUnoRoom(roomId: string): UnoRoom | undefined {
  return map().get(roomId);
}

export function deleteUnoRoom(roomId: string): void {
  map().delete(roomId);
}

export function listUnoRoomIds(): string[] {
  return [...map().keys()];
}
