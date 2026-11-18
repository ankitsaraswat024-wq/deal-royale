import { motion } from 'framer-motion';
import type { PublicPlayer } from '../../types/game';
import { COLORS } from '../../game-engine/cards/catalog';
import { isComplete } from '../../game-engine/rules/rules';
import { ColorChip } from '../cards/Card';
import { Avatar } from './Avatar';

export function OpponentCard({ p, active, waiting, onClick }: { p: PublicPlayer; active: boolean; waiting: boolean; onClick: () => void }) {
  const bank = p.bank.reduce((a, c) => a + c.value, 0);
  const complete = p.sets.filter(isComplete).length;
  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={`glass relative flex min-w-[200px] flex-none flex-col gap-2 rounded-2xl p-3 text-left transition ${active ? 'ring-2 ring-gold-400 shadow-[0_0_24px_rgba(236,198,106,.35)]' : ''} ${!p.connected ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <Avatar avatar={p.avatar} size={38} online={p.connected} active={active} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{p.name}</div>
          <div className="text-[11px] text-white/55">{!p.connected ? 'Disconnected' : waiting ? 'Deciding…' : active ? 'Playing' : 'Waiting'}</div>
        </div>
        <div className="flex items-center gap-0.5" title={`${p.handCount} cards in hand`}>
          <div className="relative h-6 w-5">
            <div className="absolute inset-0 rotate-[-8deg] rounded-[3px] border border-gold-400/70 bg-felt-700" />
            <div className="absolute inset-0 rotate-[6deg] rounded-[3px] border border-gold-400/70 bg-felt-600" />
          </div>
          <span className="text-sm font-bold">{p.handCount}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-gold-300">₹{bank}M bank</span>
        <span className="text-white/60">
          {complete}/3 sets {complete >= 2 && <span className="text-red-300">⚠</span>}
        </span>
      </div>
      <div className="flex min-h-[16px] flex-wrap gap-1.5">
        {p.sets.map((s) => (
          <span key={s.color} className={`flex items-center gap-[2px] rounded px-1 py-0.5 ${isComplete(s) ? 'bg-gold-400/25 ring-1 ring-gold-400' : 'bg-black/25'}`} title={`${COLORS[s.color].label} ${s.cards.length}/${COLORS[s.color].setSize}`}>
            {s.cards.map((c) => (
              <ColorChip key={c.card.id} color={COLORS[s.color].bg} size={12} />
            ))}
            {s.house && <span className="text-[10px]">🏠</span>}
            {s.hotel && <span className="text-[10px]">🏨</span>}
          </span>
        ))}
        {p.sets.length === 0 && <span className="text-[11px] text-white/35">No properties</span>}
      </div>
    </motion.button>
  );
}
