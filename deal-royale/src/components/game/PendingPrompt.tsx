import { useMemo, useState } from 'react';
import type { Pending, PlayerView, PublicPlayer } from '../../types/game';
import { cardTitle, COLORS } from '../../game-engine/cards/catalog';
import { findSet, locateProperty, payableCards, suggestPayment } from '../../game-engine/rules/rules';
import { useIntent } from '../../hooks/useIntent';
import { Card } from '../cards/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export function describePending(pd: Pending, byId: (id: string) => PublicPlayer | undefined): string {
  const actor = byId(pd.actorId)?.name ?? 'Someone';
  const target = byId(pd.targets[pd.current]?.playerId ?? '')?.name ?? 'someone';
  switch (pd.kind) {
    case 'rent':
      return `${actor} charged ${pd.targets.length > 1 ? 'everyone' : target} ₹${pd.amount}M rent${pd.color ? ` for ${COLORS[pd.color].label}` : ''}`;
    case 'dues':
      return `${actor} is collecting ₹5M dues from ${target}`;
    case 'celebration':
      return `${actor} is celebrating — everyone pays ₹2M`;
    case 'swipe':
      return `${actor} is swiping a property from ${target}`;
    case 'swap':
      return `${actor} wants to swap properties with ${target}`;
    case 'heist':
      return `${actor} is attempting a Grand Heist on ${target}`;
  }
}

/** Shown when YOU must decide: respond with Veto, counter a Veto, or pay. */
export function PendingPrompt({ view, byId }: { view: PlayerView; byId: (id: string) => PublicPlayer | undefined }) {
  const pd = view.pending;
  const t = pd?.targets[pd.current];
  const me = byId(view.you)!;
  const iAmTarget = !!t && t.playerId === view.you && (t.phase === 'respond' || t.phase === 'pay');
  const iAmCounter = !!t && t.phase === 'counter' && pd!.actorId === view.you;
  const open = !!pd && (iAmTarget || iAmCounter) && view.phase !== 'over';
  return (
    <Modal open={open} title={pd && t ? (t.phase === 'pay' ? `You owe ₹${pd.amount}M` : t.phase === 'counter' ? 'Your action was vetoed!' : 'Action against you!') : ''} wide={t?.phase === 'pay'}>
      {pd && t && (t.phase === 'pay' ? <PaymentPicker pd={pd} me={me} byId={byId} /> : <Respond pd={pd} view={view} byId={byId} counter={t.phase === 'counter'} />)}
    </Modal>
  );
}

function Respond({ pd, view, byId, counter }: { pd: Pending; view: PlayerView; byId: (id: string) => PublicPlayer | undefined; counter: boolean }) {
  const { send, busy } = useIntent();
  const target = byId(pd.targets[pd.current].playerId)!;
  const actor = byId(pd.actorId)!;
  const vetoes = view.hand.filter((c) => c.type === 'action' && c.action === 'veto').length;
  const takeLoc = pd.takeCardId ? locateProperty(target, pd.takeCardId) : null;
  const giveLoc = pd.giveCardId ? locateProperty(actor, pd.giveCardId) : null;
  const heistSet = pd.kind === 'heist' && pd.color ? findSet(target, pd.color) : undefined;
  return (
    <div>
      <p className="text-lg text-white/90">{counter ? `${target.name} played Veto to block your ${pd.label}.` : describePending(pd, byId) + '.'}</p>
      {!counter && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {takeLoc && (
            <div className="text-center">
              <div className="mb-1 text-xs font-bold text-red-300">{pd.kind === 'swap' ? 'They take' : 'You lose'}</div>
              <Card card={takeLoc.set.cards[takeLoc.index].card} width={100} />
            </div>
          )}
          {giveLoc && (
            <div className="text-center">
              <div className="mb-1 text-xs font-bold text-emerald-300">You get</div>
              <Card card={giveLoc.set.cards[giveLoc.index].card} width={100} />
            </div>
          )}
          {heistSet && (
            <div className="text-center">
              <div className="mb-1 text-xs font-bold text-red-300">
                You lose your whole {COLORS[heistSet.color].label} set {heistSet.house ? '🏠' : ''}
                {heistSet.hotel ? '🏨' : ''}
              </div>
              <div className="flex gap-1">
                {heistSet.cards.map((c) => (
                  <Card key={c.card.id} card={c.card} width={70} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-sm text-white/60">
        You have {vetoes} Veto card{vetoes === 1 ? '' : 's'}. {counter ? 'Play one to cancel their Veto?' : 'Play one to cancel this action?'}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="ghost" loading={busy} onClick={() => send({ type: 'respond', veto: false })}>
          {counter ? 'Accept the Veto' : pd.kind === 'rent' || pd.kind === 'dues' || pd.kind === 'celebration' ? 'Accept & pay' : 'Accept'}
        </Button>
        <Button loading={busy} onClick={() => send({ type: 'respond', veto: true })}>
          ✋ Play Veto
        </Button>
      </div>
    </div>
  );
}

function PaymentPicker({ pd, me, byId }: { pd: Pending; me: PublicPlayer; byId: (id: string) => PublicPlayer | undefined }) {
  const { send, busy } = useIntent();
  const options = useMemo(() => payableCards(me), [me]);
  const [sel, setSel] = useState<string[]>(() => suggestPayment(me, pd.amount));
  const total = options.filter((o) => sel.includes(o.card.id)).reduce((a, o) => a + o.card.value, 0);
  const all = options.reduce((a, o) => a + o.card.value, 0);
  const enough = total >= pd.amount || (sel.length === options.length && options.length > 0);
  const actor = byId(pd.actorId);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const groups: [string, typeof options][] = [
    ['Bank', options.filter((o) => o.from === 'bank')],
    ['Properties', options.filter((o) => o.from === 'property')],
    ['Buildings', options.filter((o) => o.from === 'building')],
  ];
  return (
    <div>
      <p className="text-white/80">
        {describePending(pd, byId)}. Pay <b className="text-gold-300">{actor?.name}</b> with money and/or properties. No change is given.
        {all < pd.amount && <span className="text-amber-300"> You only have ₹{all}M, so you pay everything.</span>}
      </p>
      {groups.map(([label, list]) =>
        list.length ? (
          <div key={label} className="mt-4">
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-white/50">{label}</div>
            <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-2 pt-4">
              {list.map((o) => (
                <div key={o.card.id} className="relative">
                  <Card card={o.card} width={88} selected={sel.includes(o.card.id)} onClick={() => toggle(o.card.id)} />
                  {o.complete && o.from !== 'bank' && <span className="absolute -top-3 left-1 rounded bg-gold-400 px-1 text-[10px] font-bold text-black">SET</span>}
                </div>
              ))}
            </div>
          </div>
        ) : null,
      )}
      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-black/50 p-3 backdrop-blur">
        <div className="text-sm">
          Selected <b className={enough ? 'text-emerald-300' : 'text-amber-300'}>₹{total}M</b> of ₹{pd.amount}M
          {total > pd.amount && <span className="text-white/50"> (overpaying ₹{total - pd.amount}M)</span>}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSel(suggestPayment(me, pd.amount))}>
            Auto-select
          </Button>
          <Button size="sm" disabled={!enough} loading={busy} onClick={() => send({ type: 'pay', cardIds: sel })}>
            Pay {cardTitle({ id: '', type: 'money', value: total })}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DiscardModal({ view }: { view: PlayerView }) {
  const { send, busy } = useIntent();
  const [sel, setSel] = useState<string[]>([]);
  const need = view.hand.length - 7;
  const open = view.phase === 'discard' && view.turnPlayerId === view.you;
  return (
    <Modal open={open} title={`Too many cards — discard ${need}`} wide>
      <p className="text-sm text-white/70">You can hold at most 7 cards at the end of your turn.</p>
      <div className="scrollbar-thin mt-3 flex gap-2 overflow-x-auto pb-2 pt-5">
        {view.hand.map((c) => (
          <Card key={c.id} card={c} width={96} selected={sel.includes(c.id)} onClick={() => setSel((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : s.length < need ? [...s, c.id] : s))} />
        ))}
      </div>
      <Button className="mt-4 w-full" disabled={sel.length !== need} loading={busy} onClick={async () => (await send({ type: 'discard', cardIds: sel })) && setSel([])}>
        Discard {sel.length}/{need}
      </Button>
    </Modal>
  );
}
