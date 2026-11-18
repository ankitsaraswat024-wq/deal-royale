import type { Card, GameState, LogEntry, PlayerState } from '../../types/game';
import { shuffle } from '../cards/catalog';
import { completeColors, SETS_TO_WIN } from '../rules/rules';

export class RuleError extends Error {}
export const fail = (msg: string): never => {
  throw new RuleError(msg);
};

export function addLog(s: GameState, text: string, tone: LogEntry['tone'] = 'info'): void {
  s.logSeq += 1;
  s.log.push({ id: s.logSeq, text, tone });
  if (s.log.length > 60) s.log.splice(0, s.log.length - 60);
}

export function player(s: GameState, id: string): PlayerState {
  const p = s.players.find((x) => x.id === id);
  if (!p) fail('Unknown player');
  return p!;
}

export function currentPlayer(s: GameState): PlayerState {
  return s.players[s.turn];
}

export function drawCards(s: GameState, p: PlayerState, n: number): number {
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (s.deck.length === 0) {
      if (s.discard.length === 0) break;
      s.deck = shuffle(s.discard);
      s.discard = [];
      addLog(s, 'The discard pile was shuffled into a new draw pile.');
    }
    p.hand.push(s.deck.pop()!);
    drawn++;
  }
  return drawn;
}

export function takeFromHand(p: PlayerState, cardId: string): Card {
  const i = p.hand.findIndex((c) => c.id === cardId);
  if (i < 0) fail('That card is not in your hand.');
  return p.hand.splice(i, 1)[0];
}

export function handHas(p: PlayerState, pred: (c: Card) => boolean): Card | undefined {
  return p.hand.find(pred);
}

export function checkWin(s: GameState): boolean {
  if (s.winnerId) return true;
  const order = [...s.players.slice(s.turn), ...s.players.slice(0, s.turn)];
  for (const p of order) {
    if (completeColors(p).length >= SETS_TO_WIN) {
      s.winnerId = p.id;
      s.phase = 'over';
      s.pending = null;
      addLog(s, `${p.name} completed ${SETS_TO_WIN} full sets and wins the game!`, 'good');
      return true;
    }
  }
  return false;
}
