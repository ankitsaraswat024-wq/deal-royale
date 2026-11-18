import type { ActionKind, Card, Color } from '../../types/game';

export interface ColorInfo {
  label: string;
  setSize: number;
  rent: number[]; // rent by number of cards owned (index 0 = 1 card)
  bg: string; // card band color
  fg: string; // text color on band
  names: string[];
  value: number;
}

// Original district names — a fictional city, "Royale City".
export const COLORS: Record<Color, ColorInfo> = {
  brown: { label: 'Old Town', setSize: 2, rent: [1, 2], bg: '#8a5a3b', fg: '#fff', names: ['Clay Lane', 'Kiln Street'], value: 1 },
  sky: { label: 'Harbour', setSize: 3, rent: [1, 2, 3], bg: '#5cc8f0', fg: '#0b2533', names: ['Pier Walk', 'Lighthouse Rd', 'Tide Market'], value: 1 },
  pink: { label: 'Bloom Hills', setSize: 3, rent: [1, 2, 4], bg: '#e05aa6', fg: '#fff', names: ['Orchid Row', 'Petal Square', 'Lotus Court'], value: 2 },
  orange: { label: 'Spice Bazaar', setSize: 3, rent: [1, 3, 5], bg: '#f08a24', fg: '#2a1400', names: ['Saffron Alley', 'Cardamom Gate', 'Cinnamon Plaza'], value: 2 },
  red: { label: 'Ember Quarter', setSize: 3, rent: [2, 3, 6], bg: '#e03a3a', fg: '#fff', names: ['Forge Avenue', 'Lantern Way', 'Ruby Crescent'], value: 3 },
  yellow: { label: 'Sunset Strip', setSize: 3, rent: [2, 4, 6], bg: '#f5cf2a', fg: '#2a2200', names: ['Marigold Blvd', 'Golden Mile', 'Amber Terrace'], value: 3 },
  green: { label: 'Emerald Park', setSize: 3, rent: [2, 4, 7], bg: '#2fae5f', fg: '#fff', names: ['Banyan Drive', 'Fern Gardens', 'Jade Heights'], value: 4 },
  navy: { label: 'Skyline Towers', setSize: 2, rent: [3, 8], bg: '#2b3f9e', fg: '#fff', names: ['Crown Tower', 'Sapphire Point'], value: 4 },
  rail: { label: 'Metro Lines', setSize: 4, rent: [1, 2, 3, 4], bg: '#30343a', fg: '#fff', names: ['North Station', 'East Station', 'South Station', 'West Station'], value: 2 },
  utility: { label: 'City Power', setSize: 2, rent: [1, 2], bg: '#b9e3c6', fg: '#123', names: ['Solar Works', 'Water Works'], value: 2 },
};

export const ALL_COLORS = Object.keys(COLORS) as Color[];

export interface ActionInfo {
  title: string;
  text: string;
  value: number;
  count: number;
  icon: string;
  tint: string;
}

export const ACTIONS: Record<ActionKind, ActionInfo> = {
  heist: { title: 'Grand Heist', text: 'Steal a complete property set from any player (with any buildings).', value: 5, count: 2, icon: '💼', tint: '#7c3aed' },
  veto: { title: 'Veto', text: 'Cancel an action played against you. Can be played on another Veto.', value: 4, count: 3, icon: '✋', tint: '#0ea5e9' },
  swipe: { title: 'Swipe', text: 'Steal one property from a player. It cannot be part of a complete set.', value: 3, count: 3, icon: '🫳', tint: '#ef4444' },
  swap: { title: 'Swap', text: 'Exchange one of your properties with another player’s. Neither can be in a complete set.', value: 3, count: 4, icon: '🔄', tint: '#f59e0b' },
  dues: { title: 'Collect Dues', text: 'Force one player to pay you ₹5M.', value: 3, count: 3, icon: '🧾', tint: '#10b981' },
  celebration: { title: 'Celebration', text: 'It’s your big day! Every player pays you ₹2M.', value: 2, count: 3, icon: '🎉', tint: '#ec4899' },
  doubleDraw: { title: 'Double Draw', text: 'Draw 2 extra cards.', value: 1, count: 10, icon: '🃏', tint: '#22c55e' },
  house: { title: 'House', text: 'Add to a complete set (not Metro or Power). +₹3M rent.', value: 3, count: 3, icon: '🏠', tint: '#16a34a' },
  hotel: { title: 'Hotel', text: 'Add to a complete set that has a House. +₹4M rent.', value: 4, count: 3, icon: '🏨', tint: '#dc2626' },
  boost: { title: 'Rent Boost', text: 'Play with a Rent card to double the rent charged. Uses a play.', value: 1, count: 2, icon: '⚡', tint: '#eab308' },
};

export const BUILDABLE = (c: Color) => c !== 'rail' && c !== 'utility';

export function buildDeck(): Card[] {
  const cards: Card[] = [];
  let n = 0;
  const id = (p: string) => `${p}${++n}`;
  // Money (20)
  const money: [number, number][] = [[1, 6], [2, 5], [3, 3], [4, 3], [5, 2], [10, 1]];
  for (const [v, c] of money) for (let i = 0; i < c; i++) cards.push({ id: id('m'), type: 'money', value: v });
  // Properties (28)
  for (const color of Object.keys(COLORS) as Color[]) {
    const info = COLORS[color];
    for (const name of info.names) cards.push({ id: id('p'), type: 'property', value: info.value, color, name });
  }
  // Wild properties (11)
  const wilds: [Color[] | 'any', number, number][] = [
    [['navy', 'green'], 4, 1],
    [['green', 'rail'], 4, 1],
    [['utility', 'rail'], 2, 1],
    [['sky', 'rail'], 4, 1],
    [['sky', 'brown'], 1, 1],
    [['pink', 'orange'], 2, 2],
    [['red', 'yellow'], 3, 2],
    ['any', 0, 2],
  ];
  for (const [colors, value, c] of wilds) for (let i = 0; i < c; i++) cards.push({ id: id('w'), type: 'wild', value, colors });
  // Rent (13)
  const rents: [Color[] | 'any', number, number][] = [
    [['navy', 'green'], 1, 2],
    [['red', 'yellow'], 1, 2],
    [['pink', 'orange'], 1, 2],
    [['sky', 'brown'], 1, 2],
    [['rail', 'utility'], 1, 2],
    ['any', 3, 3],
  ];
  for (const [colors, value, c] of rents) for (let i = 0; i < c; i++) cards.push({ id: id('r'), type: 'rent', value, colors });
  // Actions (34)
  for (const kind of Object.keys(ACTIONS) as ActionKind[]) {
    const a = ACTIONS[kind];
    for (let i = 0; i < a.count; i++) cards.push({ id: id('a'), type: 'action', value: a.value, action: kind });
  }
  return cards;
}

export function shuffle<T>(arr: T[], rand: () => number = secureRandom): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

export function cardTitle(c: Card): string {
  switch (c.type) {
    case 'money':
      return `₹${c.value}M`;
    case 'property':
      return c.name;
    case 'wild':
      return c.colors === 'any' ? 'Rainbow Wild' : `${COLORS[c.colors[0]].label} / ${COLORS[c.colors[1]].label} Wild`;
    case 'rent':
      return c.colors === 'any' ? 'Wild Rent' : 'Rent';
    case 'action':
      return ACTIONS[c.action].title;
  }
}
