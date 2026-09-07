import assert from "node:assert/strict";
import test from "node:test";
import { UnoRoom, type UnoRoomEvent } from "./uno-room.ts";

function collect() {
  const events: UnoRoomEvent[] = [];
  return {
    events,
    emit: (e: UnoRoomEvent) => events.push(e),
    views: () => events.filter((e): e is Extract<UnoRoomEvent, { type: "view" }> => e.type === "view"),
    errors: () => events.filter((e) => e.type === "error"),
  };
}

test("create room, join, reject full room", () => {
  const c = collect();
  const room = new UnoRoom({ roomId: "T1", maxPlayers: 2, minPlayers: 2, emit: c.emit, random: () => 0.3 });
  room.dispatch({ type: "join", playerId: "a", name: "Ada" });
  room.dispatch({ type: "join", playerId: "b", name: "Bola" });
  assert.equal(room.getPlayers().length, 2);
  room.dispatch({ type: "join", playerId: "c", name: "Chi" });
  assert.ok(c.errors().some((e) => e.message.includes("full")));
  assert.equal(room.getPlayers().length, 2);
});

test("ready → start only by host when all ready", () => {
  const c = collect();
  const room = new UnoRoom({ roomId: "T2", emit: c.emit, random: () => 0.25 });
  room.dispatch({ type: "join", playerId: "a", name: "Ada" });
  room.dispatch({ type: "join", playerId: "b", name: "Bola" });
  room.dispatch({ type: "start", playerId: "a" });
  assert.ok(c.errors().some((e) => /ready/i.test(e.message)));
  room.dispatch({ type: "ready", playerId: "a", ready: true });
  room.dispatch({ type: "ready", playerId: "b", ready: true });
  assert.equal(room.phase, "READY");
  room.dispatch({ type: "start", playerId: "b" });
  assert.ok(c.errors().some((e) => /host/i.test(e.message)));
  room.dispatch({ type: "start", playerId: "a" });
  assert.equal(room.phase, "PLAYING");
  assert.ok(room.viewFor("a"));
  assert.ok(room.viewFor("b"));
});

test("hidden hands: peer cannot see other cards", () => {
  const room = new UnoRoom({ roomId: "T3", random: () => 0.4 });
  room.dispatch({ type: "join", playerId: "a", name: "Ada" });
  room.dispatch({ type: "join", playerId: "b", name: "Bola" });
  room.dispatch({ type: "ready", playerId: "a", ready: true });
  room.dispatch({ type: "ready", playerId: "b", ready: true });
  room.dispatch({ type: "start", playerId: "a" });
  const viewA = room.viewFor("a")!;
  const viewB = room.viewFor("b")!;
  assert.equal("drawPile" in viewA, false);
  assert.ok(typeof viewA.drawPileCount === "number");
  const bFromA = viewA.players.find((p) => p.id === "b")!;
  assert.ok(bFromA.hand.every((c) => c.id === "hidden"));
  const aFromB = viewB.players.find((p) => p.id === "a")!;
  assert.ok(aFromB.hand.every((c) => c.id === "hidden"));
  const aSelf = viewA.players.find((p) => p.id === "a")!;
  assert.ok(aSelf.hand.every((c) => c.id !== "hidden"));
});

test("invalid play and wrong turn rejected", () => {
  const c = collect();
  const room = new UnoRoom({ roomId: "T4", emit: c.emit, random: () => 0.2 });
  room.dispatch({ type: "join", playerId: "a", name: "Ada" });
  room.dispatch({ type: "join", playerId: "b", name: "Bola" });
  room.dispatch({ type: "ready", playerId: "a", ready: true });
  room.dispatch({ type: "ready", playerId: "b", ready: true });
  room.dispatch({ type: "start", playerId: "a" });
  room.dispatch({ type: "draw", playerId: "b" });
  assert.ok(c.errors().some((e) => /not your turn/i.test(e.message)));
  room.dispatch({ type: "play", playerId: "a", cardId: "not-a-real-card" });
  assert.ok(c.errors().some((e) => /not in your hand/i.test(e.message)));
});

test("dispatch returns the validation error for HTTP callers", () => {
  const room = new UnoRoom({ roomId: "T5", random: () => 0.3 });
  const error = room.dispatch({ type: "start", playerId: "missing" });
  assert.equal(error, "Only the host can start.");
});

test("client cannot declare itself winner — only engine can", () => {
  const c = collect();
  const room = new UnoRoom({ roomId: "T6", emit: c.emit, random: () => 0.3 });
  room.dispatch({ type: "join", playerId: "a", name: "Ada" });
  room.dispatch({ type: "join", playerId: "b", name: "Bola" });
  room.dispatch({ type: "ready", playerId: "a", ready: true });
  room.dispatch({ type: "ready", playerId: "b", ready: true });
  room.dispatch({ type: "start", playerId: "a" });
  room.dispatch({ type: "play", playerId: "a", cardId: "forged-win" });
  assert.notEqual(room.phase, "FINISHED");
  assert.equal(c.events.some((e) => e.type === "finished"), false);
});

test("reconnect marks connected without duplicating seat", () => {
  const room = new UnoRoom({ roomId: "T7", random: () => 0.3 });
  room.dispatch({ type: "join", playerId: "a", name: "Ada" });
  room.dispatch({ type: "join", playerId: "b", name: "Bola" });
  room.dispatch({ type: "leave", playerId: "b" });
  assert.equal(room.getPlayers().length, 1);
  room.dispatch({ type: "join", playerId: "b", name: "Bola" });
  assert.equal(room.getPlayers().length, 2);
  room.dispatch({ type: "join", playerId: "b", name: "Bola2" });
  assert.equal(room.getPlayers().filter((p) => p.id === "b").length, 1);
  assert.equal(room.getPlayers().find((p) => p.id === "b")?.name, "Bola2");
});

test("reconnect during PLAYING restores the same seat", () => {
  const room = new UnoRoom({ roomId: "T8", random: () => 0.3 });
  room.dispatch({ type: "join", playerId: "a", name: "Ada" });
  room.dispatch({ type: "join", playerId: "b", name: "Bola" });
  room.dispatch({ type: "ready", playerId: "a", ready: true });
  room.dispatch({ type: "ready", playerId: "b", ready: true });
  room.dispatch({ type: "start", playerId: "a" });
  room.dispatch({ type: "leave", playerId: "b" });
  assert.equal(room.getPlayers().find((p) => p.id === "b")?.connected, false);
  room.dispatch({ type: "join", playerId: "b", name: "Bola" });
  const b = room.getPlayers().find((p) => p.id === "b")!;
  assert.equal(room.phase, "PLAYING");
  assert.equal(b.connected, true);
  assert.equal(b.seat, 1);
});

test("room snapshot round-trips a live game without exposing hidden cards", () => {
  const room = new UnoRoom({ roomId: "T9", random: () => 0.3 });
  room.dispatch({ type: "join", playerId: "a", name: "Ada" });
  room.dispatch({ type: "join", playerId: "b", name: "Bola" });
  room.dispatch({ type: "ready", playerId: "a", ready: true });
  room.dispatch({ type: "ready", playerId: "b", ready: true });
  room.dispatch({ type: "start", playerId: "a" });
  const snapshot = room.snapshot();
  const restored = UnoRoom.fromSnapshot(snapshot);
  assert.equal(restored.roomId, room.roomId);
  assert.equal(restored.phase, "PLAYING");
  assert.deepEqual(restored.getPlayers(), room.getPlayers());
  assert.deepEqual(restored.viewFor("a"), room.viewFor("a"));
  assert.deepEqual(restored.viewFor("b"), room.viewFor("b"));
});
