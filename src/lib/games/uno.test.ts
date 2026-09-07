import assert from "node:assert/strict";
import test from "node:test";
import { callUno, canPlay, createUnoGame, drawCards, playCard, publicUnoState, UnoRuleError } from "./uno.ts";

test("creates a standard UNO room with private hands", () => {
  const state = createUnoGame(
    [
      { id: "a", name: "Ada" },
      { id: "b", name: "Bola" },
    ],
    () => 0.25,
  );
  assert.equal(state.players.length, 2);
  assert.equal(state.players[0].hand.length, 7);
  assert.equal(state.players[1].hand.length, 7);
  assert.equal(state.drawPile.length + state.discardPile.length + state.players.reduce((sum, p) => sum + p.hand.length, 0), 108);
  assert.equal(publicUnoState(state, "a").players[1].hand.every((card) => card.id === "hidden"), true);
});

test("validates matching cards and advances after play", () => {
  const state = createUnoGame([{ id: "a", name: "Ada" }, { id: "b", name: "Bola" }], () => 0.4, 2);
  const player = state.players[0];
  const card = player.hand[0];
  player.hand = [card, { id: "spare", kind: "number", color: "green", value: 7 }];
  state.discardPile = [{ id: "top", kind: "number", color: card.color, value: 9 }];
  assert.equal(canPlay(card, state.discardPile[0]), true);
  callUno(state, "a");
  playCard(state, "a", card.id);
  assert.equal(state.currentPlayer, 1);
  assert.equal(state.turn, 1);
});

test("draws a pending draw-two penalty and advances", () => {
  const state = createUnoGame([{ id: "a", name: "Ada" }, { id: "b", name: "Bola" }], () => 0.2, 1);
  state.discardPile = [{ id: "top", kind: "action", color: "red", action: "draw2" }];
  state.players[0].hand = [
    { id: "draw-two", kind: "action", color: "red", action: "draw2" },
    { id: "follow-up", kind: "number", color: "blue", value: 4 },
    { id: "spare", kind: "number", color: "green", value: 7 },
  ];
  playCard(state, "a", "draw-two");
  assert.equal(state.pendingDraw, 2);
  const before = state.players[1].hand.length;
  drawCards(state, "b");
  assert.equal(state.players[1].hand.length, before + 2);
  assert.equal(state.currentPlayer, 0);
});

test("requires a declared color for wild cards", () => {
  const state = createUnoGame([{ id: "a", name: "Ada" }, { id: "b", name: "Bola" }], () => 0.3, 1);
  state.players[0].hand = [{ id: "wild", kind: "wild", action: "wild" }];
  assert.throws(() => playCard(state, "a", "wild"), UnoRuleError);
  playCard(state, "a", "wild", "blue");
  assert.equal(state.winner, "a");
  assert.equal(state.discardPile.at(-1)?.color, "blue");
});
