import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { PlayerView } from '../../types/game';
import { isComplete } from '../../game-engine/rules/rules';
import { Button } from '../common/Button';
import { Avatar } from '../players/Avatar';
import { SetView } from './SetView';

const CONFETTI = ['#ecc66a', '#f6dc9b', '#2fae5f', '#e03a3a', '#5cc8f0', '#e05aa6', '#ffffff'];

export function VictoryScreen({ view, isHost, onLobby, onLeave }: { view: PlayerView; isHost: boolean; onLobby: () => void; onLeave: () => void }) {
  const winner = view.players.find((p) => p.id === view.winnerId);
  const pieces = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 1.5, dur: 2.5 + Math.random() * 2.5, color: CONFETTI[i % CONFETTI.length], rot: Math.random() * 720 })),
    [],
  );
  if (!winner) return null;
  const you = winner.id === view.you;
  return (
    <motion.div className="fixed inset-0 z-[55] flex items-center justify-center overflow-hidden bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute top-[-20px] h-3 w-2 rounded-sm"
          style={{ left: `${p.left}%`, background: p.color }}
          animate={{ y: '110vh', rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      <motion.div
        initial={{ scale: 0.7, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.15 }}
        className="relative w-full max-w-3xl rounded-3xl border border-gold-400/40 bg-gradient-to-b from-[#154a31] to-[#0a2618] p-6 text-center shadow-[0_0_80px_rgba(236,198,106,.25)] sm:p-8"
      >
        <div className="text-6xl">🏆</div>
        <div className="mt-2 text-xs font-bold uppercase tracking-[0.35em] text-white/55">Victory</div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Avatar avatar={winner.avatar} size={56} active />
          <h2 className="gold-text font-[family-name:var(--font-display)] text-4xl font-extrabold sm:text-5xl">{you ? 'You win!' : `${winner.name} wins!`}</h2>
        </div>
        <p className="mt-2 text-white/70">Three complete property sets — the deal is done.</p>
        <div className="scrollbar-thin mt-6 flex justify-center gap-4 overflow-x-auto pb-2">
          {winner.sets.filter(isComplete).map((s) => (
            <SetView key={s.color} set={s} width={70} />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {isHost ? (
            <Button size="lg" onClick={onLobby}>
              Play again
            </Button>
          ) : (
            <p className="w-full text-sm text-white/60">Waiting for the host to start another round…</p>
          )}
          <Button size="lg" variant="ghost" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
