import { useMemo, useState } from 'react';
import type { ActionCard, Card as CardT, Color, PlayerView, PublicPlayer, RentCard } from '../../types/game';
import { ACTIONS, BUILDABLE, COLORS } from '../../game-engine/cards/catalog';
import { findSet, isComplete, looseProperties, rentFor, wildColors } from '../../game-engine/rules/rules';
import { useIntent } from '../../hooks/useIntent';
import { Card } from '../cards/Card';
import { Button } from '../common/Button';
import { Avatar } from '../players/Avatar';

interface Props {
  card: CardT;
  view: PlayerView;
  me: PublicPlayer;
  onDone: () => void;
}

function PlayerPick({ players, value, onPick, note }: { players: PublicPlayer[]; value?: string; onPick: (id: string) => void; note?: (p: PublicPlayer) => string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {players.map((p) => (
        <button key={p.id} onClick={() => onPick(p.id)} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${value === p.id ? 'border-gold-400 bg-gold-400/15' : 'border-white/10 bg-black/25 hover:bg-white/10'}`}>
          <Avatar avatar={p.avatar} size={34} online={p.connected} />
          <div className="min-w-0">
            <div className="truncate font-bold">{p.name}</div>
            {note && <div className="text-xs text-white/55">{note(p)}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">{title}</div>
      {children}
    </div>
  );
}

const bankOf = (p: PublicPlayer) => p.bank.reduce((a, c) => a + c.value, 0);

/** Walks the player through choosing targets for an action or rent card. */
export function ActionComposer({ card, view, me, onDone }: Props) {
  const { send, busy } = useIntent();
  const opponents = view.players.filter((p) => p.id !== me.id);
  const [target, setTarget] = useState<string>();
  const [color, setColor] = useState<Color>();
  const [take, setTake] = useState<string>();
  const [give, setGive] = useState<string>();
  const [boosts, setBoosts] = useState<string[]>([]);
  const boostCards = view.hand.filter((c) => c.type === 'action' && c.action === 'boost');
  const tp = opponents.find((p) => p.id === target);

  const submit = async (extra: Record<string, unknown> = {}) => {
    const ok = await send({ type: 'playAction', cardId: card.id, targetId: target, color, takeCardId: take, giveCardId: give, boostIds: boosts, ...extra });
    if (ok) onDone();
  };

  const body = useMemo(() => {
    if (card.type === 'rent') {
      const rc = card as RentCard;
      const colors = wildColors(rc).filter((c) => rentFor(me, c) > 0);
      const maxBoosts = Math.max(0, Math.min(boostCards.length, view.playsLeft - 1));
      const base = color ? rentFor(me, color) : 0;
      const total = base * 2 ** boosts.length;
      const ready = !!color && (rc.colors !== 'any' || !!target);
      return (
        <>
          {colors.length === 0 ? (
            <p className="rounded-xl bg-black/30 p-4 text-sm text-white/70">You don’t own any properties this card can charge rent for yet. Play matching properties first, or bank this card.</p>
          ) : (
            <Section title="Charge rent for">
              <div className="grid grid-cols-2 gap-2">
                {colors.map((c) => (
                  <button key={c} onClick={() => setColor(c)} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left font-bold transition ${color === c ? 'border-gold-400 bg-gold-400/15' : 'border-white/10 bg-black/25 hover:bg-white/10'}`}>
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-3 rounded-sm" style={{ background: COLORS[c].bg }} />
                      {COLORS[c].label}
                    </span>
                    <span className="text-gold-300">₹{rentFor(me, c)}M</span>
                  </button>
                ))}
              </div>
            </Section>
          )}
          {rc.colors === 'any' && colors.length > 0 && (
            <Section title="Charge one player">
              <PlayerPick players={opponents} value={target} onPick={setTarget} note={(p) => `Bank ₹${bankOf(p)}M`} />
            </Section>
          )}
          {maxBoosts > 0 && colors.length > 0 && (
            <Section title="Rent Boost (doubles rent, uses a play each)">
              <div className="flex flex-wrap gap-2">
                {boostCards.slice(0, maxBoosts).map((b) => {
                  const on = boosts.includes(b.id);
                  return (
                    <button key={b.id} onClick={() => setBoosts(on ? boosts.filter((x) => x !== b.id) : [...boosts, b.id])} className={`rounded-xl border px-3 py-2 text-sm font-bold ${on ? 'border-yellow-400 bg-yellow-400/20 text-yellow-200' : 'border-white/10 bg-black/25'}`}>
                      ⚡ {on ? 'Boosting' : 'Add boost'}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}
          {colors.length > 0 && (
            <Button className="w-full" disabled={!ready} loading={busy} onClick={() => submit()}>
              {ready ? `Charge ${rc.colors === 'any' ? tp?.name : 'everyone'} ₹${total}M` : 'Choose a color' + (rc.colors === 'any' ? ' and a player' : '')}
            </Button>
          )}
        </>
      );
    }

    const a = card as ActionCard;
    switch (a.action) {
      case 'doubleDraw':
      case 'celebration':
        return (
          <Button className="w-full" loading={busy} onClick={() => submit()}>
            {a.action === 'doubleDraw' ? 'Draw 2 cards' : 'Everyone pays me ₹2M'}
          </Button>
        );
      case 'dues':
        return (
          <>
            <Section title="Who pays ₹5M?">
              <PlayerPick players={opponents} value={target} onPick={setTarget} note={(p) => `Bank ₹${bankOf(p)}M`} />
            </Section>
            <Button className="w-full" disabled={!target} loading={busy} onClick={() => submit()}>
              Collect ₹5M
            </Button>
          </>
        );
      case 'house':
      case 'hotel': {
        const sets = me.sets.filter((s) => isComplete(s) && BUILDABLE(s.color) && (a.action === 'house' ? !s.house : !!s.house && !s.hotel));
        return sets.length === 0 ? (
          <p className="rounded-xl bg-black/30 p-4 text-sm text-white/70">{a.action === 'house' ? 'You need a complete set (not Metro Lines or City Power) without a House.' : 'You need a complete set that already has a House.'}</p>
        ) : (
          <>
            <Section title="Build on">
              <div className="grid grid-cols-2 gap-2">
                {sets.map((s) => (
                  <button key={s.color} onClick={() => setColor(s.color)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 font-bold ${color === s.color ? 'border-gold-400 bg-gold-400/15' : 'border-white/10 bg-black/25'}`}>
                    <span className="h-4 w-3 rounded-sm" style={{ background: COLORS[s.color].bg }} />
                    {COLORS[s.color].label}
                  </button>
                ))}
              </div>
            </Section>
            <Button className="w-full" disabled={!color} loading={busy} onClick={() => submit()}>
              Build {ACTIONS[a.action].title}
            </Button>
          </>
        );
      }
      case 'swipe':
      case 'swap': {
        const mineLoose = looseProperties(me);
        const groups = opponents.map((p) => ({ p, props: looseProperties(p) })).filter((g) => g.props.length);
        if (!groups.length) return <p className="rounded-xl bg-black/30 p-4 text-sm text-white/70">No other player has a property outside a complete set.</p>;
        if (a.action === 'swap' && !mineLoose.length) return <p className="rounded-xl bg-black/30 p-4 text-sm text-white/70">You need one of your own properties (not in a complete set) to swap.</p>;
        return (
          <>
            <Section title={a.action === 'swipe' ? 'Pick a property to steal' : 'Pick the property you want'}>
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.p.id}>
                    <div className="mb-1 flex items-center gap-2 text-sm font-bold text-white/80">
                      <Avatar avatar={g.p.avatar} size={22} /> {g.p.name}
                    </div>
                    <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-2 pt-3">
                      {g.props.map((pl) => (
                        <Card key={pl.card.id} card={pl.card} width={84} selected={take === pl.card.id} rotated={pl.card.type === 'wild' && pl.card.colors !== 'any' && pl.color === pl.card.colors[1]} onClick={() => (setTake(pl.card.id), setTarget(g.p.id))} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
            {a.action === 'swap' && (
              <Section title="Give one of yours">
                <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-2 pt-3">
                  {mineLoose.map((pl) => (
                    <Card key={pl.card.id} card={pl.card} width={84} selected={give === pl.card.id} rotated={pl.card.type === 'wild' && pl.card.colors !== 'any' && pl.color === pl.card.colors[1]} onClick={() => setGive(pl.card.id)} />
                  ))}
                </div>
              </Section>
            )}
            <Button className="w-full" disabled={!take || (a.action === 'swap' && !give)} loading={busy} onClick={() => submit()}>
              {a.action === 'swipe' ? `Swipe from ${tp?.name ?? '…'}` : `Swap with ${tp?.name ?? '…'}`}
            </Button>
          </>
        );
      }
      case 'heist': {
        const options = opponents.flatMap((p) => p.sets.filter(isComplete).map((s) => ({ p, s })));
        if (!options.length) return <p className="rounded-xl bg-black/30 p-4 text-sm text-white/70">Nobody has a complete set to steal yet.</p>;
        return (
          <>
            <Section title="Steal a complete set">
              <div className="grid gap-2">
                {options.map(({ p, s }) => (
                  <button key={p.id + s.color} onClick={() => (setTarget(p.id), setColor(s.color))} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left ${target === p.id && color === s.color ? 'border-gold-400 bg-gold-400/15' : 'border-white/10 bg-black/25 hover:bg-white/10'}`}>
                    <Avatar avatar={p.avatar} size={30} />
                    <span className="font-bold">{p.name}</span>
                    <span className="ml-auto flex items-center gap-2 text-sm">
                      <span className="h-4 w-3 rounded-sm" style={{ background: COLORS[s.color].bg }} />
                      {COLORS[s.color].label}
                      {s.house && ' 🏠'}
                      {s.hotel && ' 🏨'}
                    </span>
                  </button>
                ))}
              </div>
            </Section>
            <Button className="w-full" disabled={!target || !color || !findSet(tp ?? { sets: [] }, color!)} loading={busy} onClick={() => submit()}>
              Pull off the heist
            </Button>
          </>
        );
      }
      default:
        return <p className="text-sm text-white/70">This card can only be banked or played in response.</p>;
    }
  }, [card, me, view, opponents, target, color, take, give, boosts, busy, tp, boostCards]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div>{body}</div>;
}
