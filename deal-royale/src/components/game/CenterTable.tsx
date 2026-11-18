import { AnimatePresence, motion } from 'framer-motion';
import type { PlayerView, PublicPlayer } from '../../types/game';
import { Card } from '../cards/Card';
import { Button } from '../common/Button';
import { Avatar } from '../players/Avatar';
import { describePending } from './PendingPrompt';

interface Props {
  view: PlayerView;
  byId: (id: string) => PublicPlayer | undefined;
  waitingFor: string;
  isHost: boolean;
  onSkip: (pid: string) => void;
  pileWidth: number;
}

export function CenterTable({ view, byId, waitingFor, isHost, onSkip, pileWidth }: Props) {
  const turnP = byId(view.turnPlayerId)!;
  const waitP = byId(waitingFor);
  const myTurn = view.turnPlayerId === view.you;
  const last = view.log.slice(-1)[0];
  const pd = view.pending;
  const waitingOther = waitP && waitP.id !== view.you;
  return (
    <div className="felt-table relative flex flex-col items-center gap-4 rounded-[2rem] px-4 py-5 sm:flex-row sm:justify-between sm:px-8">
      <div className="flex items-end gap-4">
        <div className="text-center">
          <div className="relative" style={{ width: pileWidth + 6, height: pileWidth * 1.42 + 6 }}>
            {[2, 1, 0].map((o) => (
              <div key={o} className="absolute" style={{ left: o * 3, top: o * 3, opacity: view.deckCount > o ? 1 : 0.15 }}>
                <Card card={null} width={pileWidth} />
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs font-bold text-white/70">Draw · {view.deckCount}</div>
        </div>
        <div className="text-center">
          <div className="relative" style={{ width: pileWidth, height: pileWidth * 1.42 }}>
            {view.discardTop ? <Card key={view.discardTop.id} card={view.discardTop} width={pileWidth} layoutId={view.discardTop.id} /> : <div className="h-full w-full rounded-xl border-2 border-dashed border-white/20" />}
          </div>
          <div className="mt-2 text-xs font-bold text-white/70">Discard · {view.discardCount}</div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:px-6">
        <div className="flex items-center gap-3">
          <Avatar avatar={turnP.avatar} size={40} active online={turnP.connected} />
          <div className="text-left">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300/80">{myTurn ? 'Your turn' : 'Now playing'}</div>
            <div className="font-[family-name:var(--font-display)] text-xl font-bold">{myTurn ? 'You' : turnP.name}</div>
          </div>
          <div className="ml-2 flex gap-1" title="Plays left this turn">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-3 w-3 rounded-full ${i < view.playsLeft ? 'bg-gold-400 shadow-[0_0_8px_#ecc66a]' : 'bg-white/15'}`} />
            ))}
          </div>
        </div>
        <div className="mt-3 min-h-[3rem] w-full max-w-md">
          <AnimatePresence mode="popLayout">
            {pd ? (
              <motion.div key={'pd' + pd.current + pd.targets[pd.current]?.phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-black/35 px-4 py-2 text-sm">
                <b className="text-gold-300">{describePending(pd, byId)}</b>
                {waitingOther && (
                  <div className="mt-1 flex items-center justify-center gap-2 text-white/70">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                    Waiting for {waitP!.name}
                    {pd.targets[pd.current]?.phase === 'pay' ? ' to pay' : ' to respond'}…
                  </div>
                )}
              </motion.div>
            ) : (
              last && (
                <motion.div key={last.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`rounded-xl bg-black/30 px-4 py-2 text-sm ${last.tone === 'action' ? 'text-gold-300' : last.tone === 'bad' ? 'text-red-200' : last.tone === 'good' ? 'text-emerald-200' : 'text-white/80'}`}>
                  {last.text}
                </motion.div>
              )
            )}
          </AnimatePresence>
          {isHost && waitP && !waitP.connected && waitP.id !== view.you && view.phase !== 'over' && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-amber-200">
              {waitP.name} is offline.
              <Button size="sm" variant="dark" onClick={() => onSkip(waitP.id)}>
                {pd ? 'Decide for them' : 'Skip their turn'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
