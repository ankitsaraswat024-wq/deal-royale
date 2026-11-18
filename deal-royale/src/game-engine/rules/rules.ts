import type { Card, Color, PlacedProperty, PlayerState, PropertySet, PublicPlayer } from '../../types/game';
import { ALL_COLORS, COLORS } from '../cards/catalog';

type HasSets = Pick<PlayerState, 'sets'> | Pick<PublicPlayer, 'sets'>;
type HasAssets = { bank: Card[]; sets: PropertySet[] };

export const HAND_LIMIT = 7;
export const PLAYS_PER_TURN = 3;
export const SETS_TO_WIN = 3;

export function findSet(p: HasSets, color: Color): PropertySet | undefined {
  return p.sets.find((s) => s.color === color);
}

export function isComplete(set: PropertySet | undefined): boolean {
  if (!set) return false;
  return set.cards.length >= COLORS[set.color].setSize;
}

export function completeColors(p: HasSets): Color[] {
  return p.sets.filter(isComplete).map((s) => s.color);
}

export function rentFor(p: HasSets, color: Color): number {
  const set = findSet(p, color);
  if (!set || set.cards.length === 0) return 0;
  const info = COLORS[color];
  const n = Math.min(set.cards.length, info.setSize);
  let rent = info.rent[n - 1];
  if (isComplete(set)) {
    if (set.house) rent += 3;
    if (set.hotel) rent += 4;
  }
  return rent;
}

export function wildColors(card: Card): Color[] {
  if (card.type === 'property') return [card.color];
  if (card.type === 'wild' || card.type === 'rent') return card.colors === 'any' ? ALL_COLORS : card.colors;
  return [];
}

/** Find which set a property card lives in. */
export function locateProperty(p: HasSets, cardId: string): { set: PropertySet; index: number } | null {
  for (const set of p.sets) {
    const index = set.cards.findIndex((c) => c.card.id === cardId);
    if (index >= 0) return { set, index };
  }
  return null;
}

export function placeProperty(p: PlayerState, placed: PlacedProperty): void {
  let set = findSet(p, placed.color);
  if (!set) {
    set = { color: placed.color, cards: [] };
    p.sets.push(set);
    p.sets.sort((a, b) => ALL_COLORS.indexOf(a.color) - ALL_COLORS.indexOf(b.color));
  }
  set.cards.push(placed);
}

/** After cards leave a set: drop empty sets and move stranded buildings to the bank. */
export function normalizeSets(p: PlayerState): void {
  for (const set of p.sets) {
    const complete = isComplete(set);
    if ((!complete || !set.house) && set.hotel) {
      p.bank.push(set.hotel);
      set.hotel = undefined;
    }
    if (!complete && set.house) {
      p.bank.push(set.house);
      set.house = undefined;
    }
  }
  p.sets = p.sets.filter((s) => s.cards.length > 0);
}

export function removeProperty(p: PlayerState, cardId: string): PlacedProperty | null {
  const loc = locateProperty(p, cardId);
  if (!loc) return null;
  const [placed] = loc.set.cards.splice(loc.index, 1);
  normalizeSets(p);
  return placed;
}

/** Every card a player could hand over as payment (things with a value). */
export function payableCards(p: HasAssets): { card: Card; from: 'bank' | 'property' | 'building'; color?: Color; complete?: boolean }[] {
  const out: { card: Card; from: 'bank' | 'property' | 'building'; color?: Color; complete?: boolean }[] = [];
  for (const c of p.bank) if (c.value > 0) out.push({ card: c, from: 'bank' });
  for (const set of p.sets) {
    const complete = set.cards.length >= COLORS[set.color].setSize;
    for (const pl of set.cards) if (pl.card.value > 0) out.push({ card: pl.card, from: 'property', color: set.color, complete });
    if (set.hotel) out.push({ card: set.hotel, from: 'building', color: set.color, complete });
    if (set.house) out.push({ card: set.house, from: 'building', color: set.color, complete });
  }
  return out;
}

export function totalAssets(p: HasAssets): number {
  return payableCards(p).reduce((a, x) => a + x.card.value, 0);
}

/**
 * Suggest a payment: spend bank money first, then loose properties, then buildings,
 * and break up complete sets last. Tries to overpay as little as possible.
 */
export function suggestPayment(p: HasAssets, amount: number): string[] {
  const all = payableCards(p);
  const rank = (x: (typeof all)[number]) =>
    x.from === 'bank' ? 0 : x.from === 'property' && !x.complete ? 1 : x.from === 'building' ? 2 : 3;
  const total = all.reduce((a, x) => a + x.card.value, 0);
  if (total <= amount) return all.map((x) => x.card.id);
  const chosen: string[] = [];
  let sum = 0;
  for (const tier of [0, 1, 2, 3]) {
    const pool = all.filter((x) => rank(x) === tier).sort((a, b) => a.card.value - b.card.value);
    while (sum < amount && pool.length) {
      // smallest single card that finishes the payment, else the largest card in this tier
      const need = amount - sum;
      const exact = pool.findIndex((x) => x.card.value >= need);
      const pick = exact >= 0 ? pool.splice(exact, 1)[0] : pool.pop()!;
      chosen.push(pick.card.id);
      sum += pick.card.value;
    }
    if (sum >= amount) break;
  }
  return chosen;
}

/** Properties that can be targeted by Swipe/Swap (not in a complete set). */
export function looseProperties(p: HasSets): PlacedProperty[] {
  return p.sets.filter((s) => !isComplete(s)).flatMap((s) => s.cards);
}
