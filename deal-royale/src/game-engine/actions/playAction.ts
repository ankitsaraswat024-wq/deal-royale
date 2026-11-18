import type { ActionCard, Color, GameState, Intent, Pending, PendingKind, PlayerState, RentCard } from '../../types/game';
import { ACTIONS, BUILDABLE, COLORS } from '../cards/catalog';
import { findSet, isComplete, locateProperty, rentFor, wildColors } from '../rules/rules';
import { addLog, drawCards, fail, player, takeFromHand } from '../state/helpers';
import { advancePending } from './pending';

type PlayIntent = Extract<Intent, { type: 'playAction' }>;

function others(s: GameState, me: PlayerState): PlayerState[] {
  return s.players.filter((p) => p.id !== me.id);
}

function targetOf(s: GameState, me: PlayerState, id?: string): PlayerState {
  if (!id) fail('Choose a player.');
  if (id === me.id) fail('You cannot target yourself.');
  return player(s, id!);
}

function startPending(s: GameState, me: PlayerState, kind: PendingKind, cardIds: string[], amount: number, targets: PlayerState[], extra: Partial<Pending>, label: string) {
  s.pending = {
    kind,
    actorId: me.id,
    cardIds,
    amount,
    targets: targets.map((t) => ({ playerId: t.id, phase: 'respond' })),
    current: 0,
    label,
    ...extra,
  };
  advancePending(s);
}

export function playAction(s: GameState, me: PlayerState, it: PlayIntent): void {
  const card = me.hand.find((c) => c.id === it.cardId) ?? fail('That card is not in your hand.');
  if (card.type === 'rent') return playRent(s, me, card, it);
  if (card.type !== 'action') fail('That is not an action card.');
  const a = card as ActionCard;
  const title = ACTIONS[a.action].title;

  switch (a.action) {
    case 'veto':
      fail('Veto is only played in response to an action. You can bank it as money.');
      break;
    case 'boost':
      fail('Rent Boost is played together with a Rent card. You can bank it as money.');
      break;
    case 'doubleDraw': {
      takeFromHand(me, a.id);
      s.discard.push(a);
      s.playsLeft--;
      const n = drawCards(s, me, 2);
      addLog(s, `${me.name} played Double Draw and drew ${n} cards.`, 'action');
      break;
    }
    case 'house':
    case 'hotel': {
      const color = it.color ?? fail('Choose a set to build on.');
      const set = findSet(me, color);
      if (!set || !isComplete(set)) fail('You can only build on a complete set.');
      if (!BUILDABLE(color)) fail('You cannot build on Metro Lines or City Power.');
      if (a.action === 'house' && set!.house) fail('That set already has a House.');
      if (a.action === 'hotel' && !set!.house) fail('Build a House there first.');
      if (a.action === 'hotel' && set!.hotel) fail('That set already has a Hotel.');
      takeFromHand(me, a.id);
      set![a.action] = a;
      s.playsLeft--;
      addLog(s, `${me.name} built a ${title} on ${COLORS[color].label}.`, 'action');
      break;
    }
    case 'dues': {
      const t = targetOf(s, me, it.targetId);
      takeFromHand(me, a.id);
      s.discard.push(a);
      s.playsLeft--;
      addLog(s, `${me.name} played Collect Dues on ${t.name} (₹5M).`, 'action');
      startPending(s, me, 'dues', [a.id], 5, [t], {}, 'Collect Dues');
      break;
    }
    case 'celebration': {
      takeFromHand(me, a.id);
      s.discard.push(a);
      s.playsLeft--;
      addLog(s, `${me.name} is celebrating! Everyone pays ₹2M.`, 'action');
      startPending(s, me, 'celebration', [a.id], 2, others(s, me), {}, 'Celebration');
      break;
    }
    case 'swipe': {
      const t = targetOf(s, me, it.targetId);
      const loc = locateProperty(t, it.takeCardId ?? '') ?? fail('Choose a property to swipe.');
      if (isComplete(loc.set)) fail('You cannot swipe from a complete set.');
      takeFromHand(me, a.id);
      s.discard.push(a);
      s.playsLeft--;
      addLog(s, `${me.name} played Swipe on ${t.name}.`, 'action');
      startPending(s, me, 'swipe', [a.id], 0, [t], { takeCardId: it.takeCardId }, 'Swipe');
      break;
    }
    case 'swap': {
      const t = targetOf(s, me, it.targetId);
      const theirs = locateProperty(t, it.takeCardId ?? '') ?? fail('Choose the property you want.');
      const mine = locateProperty(me, it.giveCardId ?? '') ?? fail('Choose one of your properties to give.');
      if (isComplete(theirs.set) || isComplete(mine.set)) fail('Neither property can be in a complete set.');
      takeFromHand(me, a.id);
      s.discard.push(a);
      s.playsLeft--;
      addLog(s, `${me.name} played Swap on ${t.name}.`, 'action');
      startPending(s, me, 'swap', [a.id], 0, [t], { takeCardId: it.takeCardId, giveCardId: it.giveCardId }, 'Swap');
      break;
    }
    case 'heist': {
      const t = targetOf(s, me, it.targetId);
      const color = it.color ?? fail('Choose a complete set to steal.');
      if (!isComplete(findSet(t, color))) fail('That is not a complete set.');
      takeFromHand(me, a.id);
      s.discard.push(a);
      s.playsLeft--;
      addLog(s, `${me.name} is attempting a Grand Heist on ${t.name}’s ${COLORS[color].label}!`, 'action');
      startPending(s, me, 'heist', [a.id], 0, [t], { color }, 'Grand Heist');
      break;
    }
  }
}

function playRent(s: GameState, me: PlayerState, card: RentCard, it: PlayIntent): void {
  const color: Color = it.color ?? fail('Choose which color to charge rent for.');
  if (!wildColors(card).includes(color)) fail('This rent card does not cover that color.');
  const base = rentFor(me, color);
  if (base <= 0) fail(`You have no ${COLORS[color].label} properties to charge rent for.`);
  const boostIds = [...new Set(it.boostIds ?? [])];
  for (const id of boostIds) {
    const b = me.hand.find((c) => c.id === id);
    if (!b || b.type !== 'action' || b.action !== 'boost') fail('Invalid Rent Boost card.');
  }
  if (s.playsLeft < 1 + boostIds.length) fail('Not enough plays left for those Rent Boosts.');
  const targets = card.colors === 'any' ? [targetOf(s, me, it.targetId)] : others(s, me);
  const amount = base * 2 ** boostIds.length;
  for (const id of [card.id, ...boostIds]) s.discard.push(takeFromHand(me, id));
  s.playsLeft -= 1 + boostIds.length;
  const who = card.colors === 'any' ? targets[0].name : 'everyone';
  addLog(s, `${me.name} charged ${who} ₹${amount}M rent for ${COLORS[color].label}${boostIds.length ? ' (boosted!)' : ''}.`, 'action');
  startPending(s, me, 'rent', [card.id, ...boostIds], amount, targets, { color }, 'Rent');
}
