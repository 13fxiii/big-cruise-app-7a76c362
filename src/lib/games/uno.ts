export type UnoColor = "red" | "yellow" | "green" | "blue";
export type UnoAction = "skip" | "reverse" | "draw2";
export type UnoCardKind = "number" | "action" | "wild";

export type UnoCard = {
  id: string;
  kind: UnoCardKind;
  color?: UnoColor;
  value?: number;
  action?: UnoAction | "wild" | "wild4";
};

export type UnoPlayer = {
  id: string;
  name: string;
  hand: UnoCard[];
  saidUno: boolean;
};

export type UnoState = {
  players: UnoPlayer[];
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  random: UnoRandom;
  currentPlayer: number;
  direction: 1 | -1;
  pendingDraw: number;
  winner?: string;
  turn: number;
};

export type UnoRandom = () => number;

const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];

export class UnoRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnoRuleError";
  }
}

function makeDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let index = 0;
  for (const color of COLORS) {
    deck.push({ id: `c${index++}`, kind: "number", color, value: 0 });
    for (let value = 1; value <= 9; value++) {
      deck.push({ id: `c${index++}`, kind: "number", color, value });
      deck.push({ id: `c${index++}`, kind: "number", color, value });
    }
    for (const action of ["skip", "reverse", "draw2"] as const) {
      deck.push({ id: `c${index++}`, kind: "action", color, action });
      deck.push({ id: `c${index++}`, kind: "action", color, action });
    }
  }
  for (let copy = 0; copy < 4; copy++) {
    deck.push({ id: `c${index++}`, kind: "wild", action: "wild" });
    deck.push({ id: `c${index++}`, kind: "wild", action: "wild4" });
  }
  return deck;
}

function shuffle(cards: UnoCard[], random: UnoRandom): UnoCard[] {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function nextIndex(state: UnoState, from = state.currentPlayer, steps = 1): number {
  const count = state.players.length;
  return (from + state.direction * steps + count * 10) % count;
}

function topCard(state: UnoState): UnoCard {
  const card = state.discardPile.at(-1);
  if (!card) throw new UnoRuleError("The discard pile is empty.");
  return card;
}

function refillDrawPile(state: UnoState): void {
  if (state.drawPile.length > 0) return;
  if (state.discardPile.length <= 1) throw new UnoRuleError("There are no cards left to draw.");
  const top = state.discardPile.pop()!;
  state.drawPile = shuffle(state.discardPile, state.random);
  state.discardPile = [top];
}

function advance(state: UnoState, steps = 1): void {
  state.currentPlayer = nextIndex(state, state.currentPlayer, steps);
  state.turn += 1;
}

function findPlayer(state: UnoState, playerId: string): UnoPlayer {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new UnoRuleError("Player is not in this room.");
  return player;
}

function requireTurn(state: UnoState, playerId: string): UnoPlayer {
  const player = findPlayer(state, playerId);
  if (state.winner) throw new UnoRuleError("This game is already over.");
  if (state.players[state.currentPlayer].id !== playerId) throw new UnoRuleError("It is not your turn.");
  return player;
}

export function canPlay(card: UnoCard, top: UnoCard, activeColor?: UnoColor): boolean {
  const color = activeColor ?? top.color;
  if (card.kind === "wild") return true;
  if (card.color === color) return true;
  if (top.kind === "number" && card.kind === "number" && card.value === top.value) return true;
  if (top.kind === "action" && card.kind === "action" && card.action === top.action) return true;
  return false;
}

export function createUnoGame(
  names: Array<{ id: string; name: string }>,
  random: UnoRandom = Math.random,
  cardsPerPlayer = 7,
): UnoState {
  if (names.length < 2 || names.length > 10) throw new UnoRuleError("UNO rooms need 2 to 10 players.");
  if (!Number.isInteger(cardsPerPlayer) || cardsPerPlayer < 1) throw new UnoRuleError("Invalid opening hand size.");
  const deck = shuffle(makeDeck(), random);
  const players: UnoPlayer[] = names.map(({ id, name }) => ({ id, name, hand: [], saidUno: false }));
  for (let round = 0; round < cardsPerPlayer; round++) {
    for (const player of players) player.hand.push(deck.pop()!);
  }
  let opening = deck.pop()!;
  while (opening.kind === "wild" || opening.kind === "action") {
    deck.unshift(opening);
    opening = deck.pop()!;
  }
  return {
    players,
    drawPile: deck,
    discardPile: [opening],
    random,
    currentPlayer: 0,
    direction: 1,
    pendingDraw: 0,
    turn: 0,
  };
}

export function drawCards(state: UnoState, playerId: string, count = state.pendingDraw || 1): UnoCard[] {
  const player = requireTurn(state, playerId);
  if (!Number.isInteger(count) || count < 1) throw new UnoRuleError("Draw count must be positive.");
  const cards: UnoCard[] = [];
  for (let i = 0; i < count; i++) {
    refillDrawPile(state);
    cards.push(state.drawPile.pop()!);
  }
  player.hand.push(...cards);
  player.saidUno = false;
  state.pendingDraw = 0;
  advance(state);
  return cards;
}

export function callUno(state: UnoState, playerId: string): void {
  const player = findPlayer(state, playerId);
  if (player.hand.length !== 2) throw new UnoRuleError("Call UNO when you have two cards.");
  player.saidUno = true;
}

export function playCard(state: UnoState, playerId: string, cardId: string, declaredColor?: UnoColor): UnoCard {
  const player = requireTurn(state, playerId);
  const cardIndex = player.hand.findIndex((candidate) => candidate.id === cardId);
  if (cardIndex < 0) throw new UnoRuleError("That card is not in your hand.");
  const card = player.hand[cardIndex];
  if (state.pendingDraw > 0 && !(card.kind === "action" && card.action === "draw2")) {
    throw new UnoRuleError("You must draw before playing another card.");
  }
  if (!canPlay(card, topCard(state), state.discardPile.at(-1)?.color)) throw new UnoRuleError("That card cannot be played.");
  if (card.action === "wild" || card.action === "wild4") {
    if (!declaredColor || !COLORS.includes(declaredColor)) throw new UnoRuleError("Wild cards require a declared color.");
    card.color = declaredColor;
  }
  const hadCalledUno = player.saidUno;
  player.hand.splice(cardIndex, 1);
  player.saidUno = false;
  state.discardPile.push(card);
  state.pendingDraw = card.action === "draw2" || card.action === "wild4" ? state.pendingDraw + 2 : 0;
  if (player.hand.length === 0) {
    state.winner = player.id;
    return card;
  }
  if (player.hand.length === 1 && !hadCalledUno) {
    drawCards(state, playerId, 2);
    return card;
  }
  if (card.action === "reverse") state.direction = state.direction === 1 ? -1 : 1;
  advance(state, card.action === "skip" || card.action === "reverse" ? 2 : 1);
  return card;
}

export function publicUnoState(state: UnoState, viewerId: string): Omit<UnoState, "players" | "random"> & { players: Array<Omit<UnoPlayer, "hand"> & { hand: UnoCard[] }> } {
  return {
    currentPlayer: state.currentPlayer,
    direction: state.direction,
    pendingDraw: state.pendingDraw,
    turn: state.turn,
    winner: state.winner,
    drawPile: state.drawPile,
    discardPile: state.discardPile,
    players: state.players.map((player) => ({ ...player, hand: player.id === viewerId ? [...player.hand] : player.hand.map(() => ({ id: "hidden", kind: "wild" as const, action: "wild" as const })) })),
  };
}
