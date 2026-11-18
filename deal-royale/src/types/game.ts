// Core game types for Deal Royale (a Monopoly Deal-style set-collecting card game).

export type Color =
  | 'brown'
  | 'sky'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'navy'
  | 'rail'
  | 'utility';

export type ActionKind =
  | 'heist' // steal a complete set
  | 'veto' // cancel an action played against you
  | 'swipe' // steal one property not in a complete set
  | 'swap' // exchange one property each
  | 'dues' // one player pays 5
  | 'celebration' // every other player pays 2
  | 'doubleDraw' // draw 2 more cards
  | 'house' // +3 rent on a complete set
  | 'hotel' // +4 rent on a complete set that has a house
  | 'boost'; // double the rent

export interface MoneyCard {
  id: string;
  type: 'money';
  value: number;
}
export interface PropertyCard {
  id: string;
  type: 'property';
  value: number;
  color: Color;
  name: string;
}
export interface WildCard {
  id: string;
  type: 'wild';
  value: number;
  colors: Color[] | 'any';
}
export interface RentCard {
  id: string;
  type: 'rent';
  value: number;
  colors: Color[] | 'any';
}
export interface ActionCard {
  id: string;
  type: 'action';
  value: number;
  action: ActionKind;
}
export type Card = MoneyCard | PropertyCard | WildCard | RentCard | ActionCard;

/** A property (or wild) placed on the table, with the color it currently counts as. */
export interface PlacedProperty {
  card: PropertyCard | WildCard;
  color: Color;
}

export interface PropertySet {
  color: Color;
  cards: PlacedProperty[];
  house?: ActionCard;
  hotel?: ActionCard;
}

export interface PlayerState {
  id: string;
  name: string;
  avatar: number;
  hand: Card[];
  bank: Card[];
  sets: PropertySet[];
}

export type PendingKind = 'rent' | 'dues' | 'celebration' | 'swipe' | 'swap' | 'heist';

export interface PendingTarget {
  playerId: string;
  /** respond: target may Veto; counter: actor may Veto the Veto; pay: target selects payment */
  phase: 'respond' | 'counter' | 'pay' | 'done';
  result?: 'vetoed' | 'paid' | 'taken' | 'nothing';
}

export interface Pending {
  kind: PendingKind;
  actorId: string;
  cardIds: string[]; // the action card (plus any boosts)
  amount: number;
  color?: Color; // rent color or heist set color
  takeCardId?: string; // swipe/swap: card taken from target
  giveCardId?: string; // swap: card given by actor
  targets: PendingTarget[];
  current: number; // index into targets
  label: string;
}

export interface LogEntry {
  id: number;
  text: string;
  tone?: 'info' | 'good' | 'bad' | 'action';
}

export type Phase = 'play' | 'discard' | 'over';

export interface GameState {
  players: PlayerState[];
  deck: Card[];
  discard: Card[];
  turn: number; // index into players
  playsLeft: number;
  phase: Phase;
  pending: Pending | null;
  winnerId: string | null;
  log: LogEntry[];
  logSeq: number;
  turnNumber: number;
  version: number;
}

// ---------- what each player is allowed to see ----------
export interface PublicPlayer {
  id: string;
  name: string;
  avatar: number;
  handCount: number;
  bank: Card[];
  sets: PropertySet[];
  connected: boolean;
}

export interface PlayerView {
  you: string;
  hand: Card[];
  players: PublicPlayer[];
  deckCount: number;
  discardTop: Card | null;
  discardCount: number;
  turnPlayerId: string;
  playsLeft: number;
  phase: Phase;
  pending: Pending | null;
  winnerId: string | null;
  log: LogEntry[];
  turnNumber: number;
  version: number;
}

// ---------- intents a player sends to the host ----------
export type Intent =
  | { type: 'bank'; cardId: string }
  | { type: 'playProperty'; cardId: string; color: Color }
  | { type: 'moveWild'; cardId: string; color: Color }
  | {
      type: 'playAction';
      cardId: string;
      targetId?: string;
      color?: Color;
      boostIds?: string[];
      takeCardId?: string;
      giveCardId?: string;
    }
  | { type: 'respond'; veto: boolean }
  | { type: 'pay'; cardIds: string[] }
  | { type: 'discard'; cardIds: string[] }
  | { type: 'endTurn' };

export interface IntentResult {
  ok: boolean;
  error?: string;
}
