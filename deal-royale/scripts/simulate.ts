// Plays thousands of random games against the engine to check rules & card conservation.
import { applyIntent, createGame, waitingOn, skipFor } from '../src/game-engine/state/engine';
import type { GameState, Intent, Color } from '../src/types/game';
import { ALL_COLORS } from '../src/game-engine/cards/catalog';
import { payableCards, suggestPayment, looseProperties, completeColors } from '../src/game-engine/rules/rules';

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
function count(s: GameState) {
  let n = s.deck.length + s.discard.length;
  for (const p of s.players) { n += p.hand.length + p.bank.length; for (const set of p.sets) n += set.cards.length + (set.house ? 1 : 0) + (set.hotel ? 1 : 0); }
  return n;
}
function candidates(s: GameState, pid: string): Intent[] {
  const me = s.players.find(p => p.id === pid)!;
  const out: Intent[] = [];
  if (s.pending) {
    const t = s.pending.targets[s.pending.current];
    if (t.phase === 'pay') { out.push({ type: 'pay', cardIds: suggestPayment(me, s.pending.amount) }); out.push({ type: 'pay', cardIds: payableCards(me).slice(0,1).map(x=>x.card.id) }); }
    else out.push({ type: 'respond', veto: Math.random() < 0.5 });
    return out;
  }
  if (s.phase === 'discard') { return [{ type: 'discard', cardIds: me.hand.slice(0, me.hand.length - 7).map(c => c.id) }]; }
  const opp = s.players.filter(p => p.id !== pid);
  for (const c of me.hand) {
    out.push({ type: 'bank', cardId: c.id });
    out.push({ type: 'playProperty', cardId: c.id, color: pick(ALL_COLORS) as Color });
    if (c.type === 'property') out.push({ type: 'playProperty', cardId: c.id, color: c.color }), out.push({ type: 'playProperty', cardId: c.id, color: c.color });
    const t = pick(opp);
    const boosts = me.hand.filter(x => x.type === 'action' && x.action === 'boost').map(x => x.id).slice(0, Math.floor(Math.random()*2));
    out.push({ type: 'playAction', cardId: c.id, targetId: t.id, color: pick(me.sets.map(x=>x.color).concat(t.sets.map(x=>x.color)).concat(['red' as Color])), boostIds: boosts,
      takeCardId: pick(looseProperties(t).map(x=>x.card.id).concat([''])), giveCardId: pick(looseProperties(me).map(x=>x.card.id).concat(['']))});
  }
  for (const set of me.sets) for (const pl of set.cards) if (pl.card.type === 'wild') out.push({ type: 'moveWild', cardId: pl.card.id, color: pick(ALL_COLORS) });
  out.push({ type: 'endTurn' });
  return out;
}
let wins = 0, stuck = 0, errs = new Map<string, number>(), oks = new Map<string, number>(), totalTurns = 0;
for (let g = 0; g < 60; g++) {
  const np = 2 + (g % 4);
  let s = createGame(Array.from({ length: np }, (_, i) => ({ id: 'p' + i, name: 'P' + i, avatar: i })));
  const N = count(s);
  let steps = 0;
  while (s.phase !== 'over' && steps < 4000) {
    steps++;
    const pid = waitingOn(s);
    if (Math.random() < 0.01) { const ns = skipFor(s, pid); if (ns !== s) { s = ns; continue; } }
    const cs = candidates(s, pid);
    let moved = false;
    for (let k = 0; k < 30 && !moved; k++) {
      const it = pick(cs);
      const r = applyIntent(s, pid, it);
      const key = it.type;
      if (r.result.ok) { s = r.state; moved = true; oks.set(key, (oks.get(key) || 0) + 1); }
      else errs.set(r.result.error!, (errs.get(r.result.error!) || 0) + 1);
    }
    if (!moved) { const r = applyIntent(s, pid, { type: 'endTurn' }); if (r.result.ok) s = r.state; else { stuck++; break; } }
    if (count(s) !== N) throw new Error(`card count changed in game ${g}: ${count(s)} vs ${N}`);
    for (const p of s.players) for (const set of p.sets) {
      if (set.cards.length === 0) throw new Error('empty set');
      if (set.hotel && !set.house) throw new Error('hotel without house');
      for (const pl of set.cards) if (pl.color !== set.color) throw new Error('color mismatch');
    }
    if (s.winnerId && completeColors(s.players.find(p=>p.id===s.winnerId)!).length < 3) throw new Error('bad win');
  }
  if (s.phase === 'over') wins++;
  totalTurns += s.turnNumber;
}
console.log({ games: 60, finishedWithWinner: wins, stuck, avgTurns: Math.round(totalTurns / 60) });
console.log('ok moves', Object.fromEntries(oks));
console.log('top rejections', [...errs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12));
