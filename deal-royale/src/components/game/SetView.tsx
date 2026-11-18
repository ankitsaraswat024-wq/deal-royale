import { motion } from 'framer-motion';
import type { PropertySet } from '../../types/game';
import { COLORS } from '../../game-engine/cards/catalog';
import { isComplete, rentFor } from '../../game-engine/rules/rules';
import { Card } from '../cards/Card';

interface Props {
  set: PropertySet;
  width: number;
  onCardClick?: (cardId: string) => void;
  clickable?: (cardId: string) => boolean;
  highlight?: (cardId: string) => boolean;
  layout?: boolean;
}

/** A property set: header with progress, cards fanned vertically, buildings on top. */
export function SetView({ set, width, onCardClick, clickable, highlight, layout }: Props) {
  const info = COLORS[set.color];
  const done = isComplete(set);
  const peek = Math.round(width * 0.42);
  const stack = [...set.cards.map((c) => ({ kind: 'prop' as const, placed: c })), ...(set.house ? [{ kind: 'bld' as const, card: set.house }] : []), ...(set.hotel ? [{ kind: 'bld' as const, card: set.hotel }] : [])];
  const height = Math.round(width * 1.42) + peek * (stack.length - 1);
  return (
    <motion.div layout={layout} className="flex flex-none flex-col items-center gap-1.5" style={{ width: width + 8 }}>
      <div
        className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] font-extrabold ${done ? 'ring-2 ring-gold-400' : ''}`}
        style={{ background: info.bg, color: info.fg }}
        title={`${info.label}: ${set.cards.length}/${info.setSize}, rent ₹${rentFor({ sets: [set] }, set.color)}M`}
      >
        <span className="truncate">{info.label}</span>
        <span>{done ? '★' : `${Math.min(set.cards.length, info.setSize)}/${info.setSize}`}</span>
      </div>
      <div className="relative" style={{ width, height }}>
        {stack.map((s, i) => {
          const card = s.kind === 'prop' ? s.placed.card : s.card;
          const rotated = s.kind === 'prop' && card.type === 'wild' && card.colors !== 'any' && s.placed.color === card.colors[1];
          const can = !!onCardClick && (clickable ? clickable(card.id) : true);
          return (
            <div key={card.id} className="absolute left-0" style={{ top: i * peek, zIndex: i }}>
              <Card
                card={card}
                width={width}
                rotated={rotated}
                layoutId={layout ? card.id : undefined}
                selected={highlight?.(card.id)}
                onClick={can ? () => onCardClick!(card.id) : undefined}
                title={card.type === 'wild' && can ? 'Tap to move this wild card' : undefined}
              />
            </div>
          );
        })}
      </div>
      <div className="text-[11px] font-bold text-white/60">Rent ₹{rentFor({ sets: [set] }, set.color)}M</div>
    </motion.div>
  );
}
