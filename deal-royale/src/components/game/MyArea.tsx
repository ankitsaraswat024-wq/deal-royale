import { useState } from 'react';
import type { Color, PublicPlayer, WildCard } from '../../types/game';
import { COLORS } from '../../game-engine/cards/catalog';
import { locateProperty, wildColors } from '../../game-engine/rules/rules';
import { useIntent } from '../../hooks/useIntent';
import { Card } from '../cards/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { SetView } from './SetView';

export const bankTotal = (p: Pick<PublicPlayer, 'bank'>) => p.bank.reduce((a, c) => a + c.value, 0);

export function BankStack({ player, width, layout }: { player: PublicPlayer; width: number; layout?: boolean }) {
  const total = bankTotal(player);
  const overlap = Math.round(width * 0.28);
  const cards = player.bank.slice(-8);
  return (
    <div className="flex flex-none flex-col items-center gap-1.5">
      <div className="w-full rounded-lg bg-black/35 px-2 py-1 text-center text-[11px] font-extrabold text-gold-300">BANK ₹{total}M</div>
      <div className="relative" style={{ width: cards.length ? width + overlap * (cards.length - 1) : width, height: Math.round(width * 1.42) }}>
        {cards.length === 0 && <div className="grid h-full w-full place-items-center rounded-xl border-2 border-dashed border-white/15 text-xs text-white/35">Empty</div>}
        {cards.map((c, i) => (
          <div key={c.id} className="absolute top-0" style={{ left: i * overlap, zIndex: i }}>
            <Card card={c} width={width} layoutId={layout ? c.id : undefined} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Your bank and property sets. On your turn you can tap a wild card to move it. */
export function MyArea({ me, canRearrange, width }: { me: PublicPlayer; canRearrange: boolean; width: number }) {
  const { send, busy } = useIntent();
  const [wildId, setWildId] = useState<string | null>(null);
  const loc = wildId ? locateProperty(me, wildId) : null;
  const wild = loc?.set.cards[loc.index];

  return (
    <div className="scrollbar-thin flex items-start gap-4 overflow-x-auto px-3 pb-3 pt-1">
      <BankStack player={me} width={width} layout />
      <div className="w-px self-stretch bg-white/10" />
      {me.sets.length === 0 && <div className="grid h-24 flex-1 place-items-center rounded-xl border-2 border-dashed border-white/10 px-6 text-sm text-white/40">Your properties will appear here</div>}
      {me.sets.map((s) => (
        <SetView key={s.color} set={s} width={width} layout onCardClick={canRearrange ? setWildId : undefined} clickable={(id) => locateProperty(me, id)?.set.cards[locateProperty(me, id)!.index].card.type === 'wild'} />
      ))}
      <Modal open={!!wild} onClose={() => setWildId(null)} title="Move wild card">
        {wild && (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Card card={wild.card} width={130} rotated={wild.card.type === 'wild' && wild.card.colors !== 'any' && wild.color === wild.card.colors[1]} />
            <div className="flex-1">
              <p className="mb-3 text-sm text-white/70">Currently counts as <b>{COLORS[wild.color].label}</b>. Moving a wild doesn’t use a play.</p>
              <div className="grid grid-cols-2 gap-2">
                {wildColors(wild.card as WildCard)
                  .filter((c: Color) => c !== wild.color)
                  .map((c) => (
                    <Button
                      key={c}
                      size="sm"
                      variant="dark"
                      disabled={busy}
                      onClick={async () => {
                        if (await send({ type: 'moveWild', cardId: wild.card.id, color: c })) setWildId(null);
                      }}
                    >
                      <span className="h-3 w-3 rounded-sm" style={{ background: COLORS[c].bg }} /> {COLORS[c].label}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
