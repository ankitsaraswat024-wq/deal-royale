import type { GameState, Pending, PendingTarget } from '../../types/game';
import { cardTitle } from '../cards/catalog';
import { findSet, locateProperty, normalizeSets, payableCards, placeProperty, removeProperty, suggestPayment } from '../rules/rules';
import { addLog, checkWin, fail, player } from '../state/helpers';

const isVeto = (c: { type: string; action?: string }) => c.type === 'action' && c.action === 'veto';

/** What happens once a target accepts the action. */
function onAccepted(s: GameState, pd: Pending, t: PendingTarget): void {
  if (pd.kind === 'rent' || pd.kind === 'dues' || pd.kind === 'celebration') {
    t.phase = 'pay';
    return;
  }
  executeSteal(s, pd, t);
}

function executeSteal(s: GameState, pd: Pending, t: PendingTarget): void {
  const actor = player(s, pd.actorId);
  const target = player(s, t.playerId);
  if (pd.kind === 'swipe') {
    const placed = removeProperty(target, pd.takeCardId!);
    if (placed) {
      placeProperty(actor, placed);
      addLog(s, `${actor.name} swiped ${cardTitle(placed.card)} from ${target.name}.`, 'action');
    }
  } else if (pd.kind === 'swap') {
    const taken = removeProperty(target, pd.takeCardId!);
    const given = removeProperty(actor, pd.giveCardId!);
    if (taken) placeProperty(actor, taken);
    if (given) placeProperty(target, given);
    if (taken && given) addLog(s, `${actor.name} swapped ${cardTitle(given.card)} for ${target.name}’s ${cardTitle(taken.card)}.`, 'action');
  } else if (pd.kind === 'heist') {
    const set = findSet(target, pd.color!);
    if (set) {
      target.sets = target.sets.filter((x) => x !== set);
      for (const pl of set.cards) placeProperty(actor, pl);
      const mine = findSet(actor, pd.color!)!;
      for (const b of [set.house, set.hotel]) {
        if (!b) continue;
        const slot = b.action === 'house' ? 'house' : 'hotel';
        if (!mine[slot]) mine[slot] = b;
        else actor.bank.push(b);
      }
      normalizeSets(actor);
      addLog(s, `${actor.name} pulled a Grand Heist and took ${target.name}’s whole set!`, 'action');
    }
  }
  t.phase = 'done';
  t.result = 'taken';
  s.pending!.current++;
}

/** Move the pending action forward until someone has to make a decision. */
export function advancePending(s: GameState): void {
  while (s.pending) {
    const pd = s.pending;
    const t = pd.targets[pd.current];
    if (!t) {
      s.pending = null;
      checkWin(s);
      return;
    }
    const target = player(s, t.playerId);
    const actor = player(s, pd.actorId);
    if (t.phase === 'respond') {
      if (target.hand.some(isVeto)) return; // target must decide
      onAccepted(s, pd, t);
      continue;
    }
    if (t.phase === 'counter') {
      if (actor.hand.some(isVeto)) return; // actor must decide
      t.phase = 'done';
      t.result = 'vetoed';
      pd.current++;
      continue;
    }
    if (t.phase === 'pay') {
      if (payableCards(target).length === 0) {
        addLog(s, `${target.name} has nothing to pay with.`);
        t.phase = 'done';
        t.result = 'nothing';
        pd.current++;
        continue;
      }
      return; // target must choose payment
    }
    pd.current++;
  }
  checkWin(s);
}

export function respond(s: GameState, pid: string, veto: boolean): void {
  const pd = s.pending ?? fail('Nothing to respond to.');
  const t = pd.targets[pd.current];
  if (!t) fail('Nothing to respond to.');
  if (t.phase === 'respond') {
    if (t.playerId !== pid) fail('It is not your decision.');
    const p = player(s, pid);
    if (veto) {
      const i = p.hand.findIndex(isVeto);
      if (i < 0) fail('You have no Veto card.');
      s.discard.push(p.hand.splice(i, 1)[0]);
      t.phase = 'counter';
      addLog(s, `${p.name} played Veto!`, 'action');
    } else {
      onAccepted(s, pd, t);
    }
  } else if (t.phase === 'counter') {
    if (pd.actorId !== pid) fail('It is not your decision.');
    const p = player(s, pid);
    if (veto) {
      const i = p.hand.findIndex(isVeto);
      if (i < 0) fail('You have no Veto card.');
      s.discard.push(p.hand.splice(i, 1)[0]);
      t.phase = 'respond';
      addLog(s, `${p.name} vetoed the Veto!`, 'action');
    } else {
      t.phase = 'done';
      t.result = 'vetoed';
      pd.current++;
      addLog(s, `${player(s, t.playerId).name} blocked the ${pd.label}.`);
    }
  } else fail('Waiting for a payment, not a response.');
  advancePending(s);
}

export function pay(s: GameState, pid: string, cardIds: string[]): void {
  const pd = s.pending ?? fail('Nothing to pay.');
  const t = pd.targets[pd.current];
  if (!t || t.phase !== 'pay' || t.playerId !== pid) fail('You do not owe anything right now.');
  const payer = player(s, pid);
  const actor = player(s, pd.actorId);
  const ids = [...new Set(cardIds)];
  const payable = payableCards(payer);
  const chosen = ids.map((id) => payable.find((x) => x.card.id === id) ?? fail('You can only pay with cards on your table.'));
  const sum = chosen.reduce((a, x) => a + x.card.value, 0);
  const all = payable.reduce((a, x) => a + x.card.value, 0);
  if (sum < pd.amount && sum < all) fail(`Select at least ₹${pd.amount}M (or everything you have).`);
  if (chosen.length === 0) fail('Select cards to pay with.');
  for (const x of chosen) {
    if (x.from === 'bank') {
      payer.bank = payer.bank.filter((c) => c.id !== x.card.id);
      actor.bank.push(x.card);
    } else if (x.from === 'building') {
      for (const set of payer.sets) {
        if (set.house?.id === x.card.id) set.house = undefined;
        if (set.hotel?.id === x.card.id) set.hotel = undefined;
      }
      actor.bank.push(x.card);
    } else {
      const loc = locateProperty(payer, x.card.id);
      if (loc) {
        const [placed] = loc.set.cards.splice(loc.index, 1);
        placeProperty(actor, placed);
      }
    }
  }
  normalizeSets(payer);
  normalizeSets(actor);
  addLog(s, `${payer.name} paid ${actor.name} ₹${sum}M${sum < pd.amount ? ' (all they had)' : ''}.`, 'bad');
  t.phase = 'done';
  t.result = 'paid';
  pd.current++;
  advancePending(s);
}

/** Used by the host when a player is disconnected: make the default decision for them. */
export function autoDecide(s: GameState, pid: string): boolean {
  const pd = s.pending;
  if (!pd) return false;
  const t = pd.targets[pd.current];
  if (!t) return false;
  if (t.phase === 'respond' && t.playerId === pid) return respond(s, pid, false), true;
  if (t.phase === 'counter' && pd.actorId === pid) return respond(s, pid, false), true;
  if (t.phase === 'pay' && t.playerId === pid) return pay(s, pid, suggestPayment(player(s, pid), pd.amount)), true;
  return false;
}


