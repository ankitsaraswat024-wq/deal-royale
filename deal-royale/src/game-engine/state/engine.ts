import type { Color, GameState, Intent, IntentResult, PlayerState, PlayerView } from '../../types/game';
import { buildDeck, cardTitle, COLORS, shuffle } from '../cards/catalog';
import { autoDecide, pay, respond } from '../actions/pending';
import { playAction } from '../actions/playAction';
import { HAND_LIMIT, locateProperty, normalizeSets, placeProperty, PLAYS_PER_TURN, wildColors } from '../rules/rules';
import { addLog, checkWin, currentPlayer, drawCards, fail, player, RuleError, takeFromHand } from './helpers';

export interface Seat {
  id: string;
  name: string;
  avatar: number;
}

export function createGame(seats: Seat[]): GameState {
  if (seats.length < 2 || seats.length > 5) throw new Error('Deal Royale needs 2–5 players.');
  const s: GameState = {
    players: seats.map((p) => ({ ...p, hand: [], bank: [], sets: [] })),
    deck: shuffle(buildDeck()),
    discard: [],
    turn: Math.floor(Math.random() * seats.length),
    playsLeft: PLAYS_PER_TURN,
    phase: 'play',
    pending: null,
    winnerId: null,
    log: [],
    logSeq: 0,
    turnNumber: 0,
    version: 0,
  };
  for (const p of s.players) drawCards(s, p, 5);
  addLog(s, 'Cards dealt. First to collect 3 complete property sets wins!', 'good');
  startTurn(s);
  return s;
}

function startTurn(s: GameState): void {
  const p = currentPlayer(s);
  const n = drawCards(s, p, p.hand.length === 0 ? 5 : 2);
  s.playsLeft = PLAYS_PER_TURN;
  s.phase = 'play';
  s.turnNumber++;
  addLog(s, `${p.name}’s turn — drew ${n} card${n === 1 ? '' : 's'}.`);
}

function nextTurn(s: GameState): void {
  s.turn = (s.turn + 1) % s.players.length;
  startTurn(s);
}

function requireTurn(s: GameState, pid: string): PlayerState {
  if (s.phase === 'over') fail('The game is over.');
  const p = currentPlayer(s);
  if (p.id !== pid) fail('It is not your turn.');
  if (s.pending) fail('Waiting for other players to respond.');
  return p;
}

function apply(s: GameState, pid: string, it: Intent): void {
  switch (it.type) {
    case 'respond':
      return respond(s, pid, it.veto);
    case 'pay':
      return pay(s, pid, it.cardIds);
    case 'bank': {
      const me = requireTurn(s, pid);
      if (s.phase !== 'play' || s.playsLeft <= 0) fail('No plays left this turn.');
      const c = me.hand.find((x) => x.id === it.cardId) ?? fail('That card is not in your hand.');
      if (c.type === 'property' || c.type === 'wild') fail('Properties cannot go in the bank.');
      me.bank.push(takeFromHand(me, c.id));
      s.playsLeft--;
      addLog(s, `${me.name} banked ${cardTitle(c)} (₹${c.value}M).`);
      return;
    }
    case 'playProperty': {
      const me = requireTurn(s, pid);
      if (s.phase !== 'play' || s.playsLeft <= 0) fail('No plays left this turn.');
      const c = me.hand.find((x) => x.id === it.cardId) ?? fail('That card is not in your hand.');
      if (c.type !== 'property' && c.type !== 'wild') fail('That is not a property.');
      const color: Color = c.type === 'property' ? c.color : it.color;
      if (!wildColors(c).includes(color)) fail('That wild card cannot be used as that color.');
      takeFromHand(me, c.id);
      placeProperty(me, { card: c as never, color });
      s.playsLeft--;
      addLog(s, `${me.name} played ${c.type === 'wild' ? 'a wild card' : cardTitle(c)} on ${COLORS[color].label}.`);
      checkWin(s);
      return;
    }
    case 'moveWild': {
      const me = requireTurn(s, pid);
      const loc = locateProperty(me, it.cardId) ?? fail('That card is not on your table.');
      const placed = loc.set.cards[loc.index];
      if (placed.card.type !== 'wild') fail('Only wild cards can be moved.');
      if (!wildColors(placed.card).includes(it.color)) fail('That wild card cannot be used as that color.');
      if (placed.color === it.color) return;
      loc.set.cards.splice(loc.index, 1);
      normalizeSets(me);
      placeProperty(me, { card: placed.card, color: it.color });
      addLog(s, `${me.name} moved a wild card to ${COLORS[it.color].label}.`);
      checkWin(s);
      return;
    }
    case 'playAction': {
      const me = requireTurn(s, pid);
      if (s.phase !== 'play' || s.playsLeft <= 0) fail('No plays left this turn.');
      return playAction(s, me, it);
    }
    case 'endTurn': {
      const me = requireTurn(s, pid);
      if (s.phase !== 'play') fail('Discard down to 7 cards first.');
      if (me.hand.length > HAND_LIMIT) {
        s.phase = 'discard';
        addLog(s, `${me.name} must discard ${me.hand.length - HAND_LIMIT} card(s).`);
        return;
      }
      return nextTurn(s);
    }
    case 'discard': {
      const me = requireTurn(s, pid);
      if (s.phase !== 'discard') fail('You do not need to discard.');
      const ids = [...new Set(it.cardIds)];
      const need = me.hand.length - HAND_LIMIT;
      if (ids.length !== need) fail(`Choose exactly ${need} card(s) to discard.`);
      for (const id of ids) s.discard.push(takeFromHand(me, id));
      addLog(s, `${me.name} discarded ${need} card(s).`);
      return nextTurn(s);
    }
  }
}

/** Apply a player's intent atomically. The host calls this for every move. */
export function applyIntent(state: GameState, pid: string, it: Intent): { state: GameState; result: IntentResult } {
  const s: GameState = structuredClone(state);
  try {
    apply(s, pid, it);
    s.version++;
    return { state: s, result: { ok: true } };
  } catch (e) {
    if (e instanceof RuleError) return { state, result: { ok: false, error: e.message } };
    console.error(e);
    return { state, result: { ok: false, error: 'Something went wrong with that move.' } };
  }
}

/** Host-only: act on behalf of a disconnected player so the game can continue. */
export function skipFor(state: GameState, pid: string): GameState {
  const s: GameState = structuredClone(state);
  try {
    if (autoDecide(s, pid)) {
      addLog(s, `${player(s, pid).name} is offline — the host made the default choice for them.`);
    } else if (!s.pending && currentPlayer(s).id === pid && s.phase !== 'over') {
      const me = currentPlayer(s);
      while (me.hand.length > HAND_LIMIT) s.discard.push(me.hand.pop()!);
      addLog(s, `${me.name} is offline — the host skipped their turn.`);
      nextTurn(s);
    } else return state;
    s.version++;
    return s;
  } catch {
    return state;
  }
}

/** Who the game is currently waiting on. */
export function waitingOn(s: { pending: GameState['pending']; players: { id: string }[]; turn?: number; turnPlayerId?: string }): string {
  if (s.pending) {
    const t = s.pending.targets[s.pending.current];
    if (t) return t.phase === 'counter' ? s.pending.actorId : t.playerId;
  }
  return s.turnPlayerId ?? s.players[s.turn ?? 0].id;
}

/** Build the view a single player is allowed to see (their own hand only). */
export function viewFor(s: GameState, pid: string, connected: (id: string) => boolean): PlayerView {
  const me = s.players.find((p) => p.id === pid);
  return {
    you: pid,
    hand: me ? me.hand : [],
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      handCount: p.hand.length,
      bank: p.bank,
      sets: p.sets,
      connected: connected(p.id),
    })),
    deckCount: s.deck.length,
    discardTop: s.discard[s.discard.length - 1] ?? null,
    discardCount: s.discard.length,
    turnPlayerId: currentPlayer(s).id,
    playsLeft: s.playsLeft,
    phase: s.phase,
    pending: s.pending,
    winnerId: s.winnerId,
    log: s.log.slice(-30),
    turnNumber: s.turnNumber,
    version: s.version,
  };
}
