import { LayoutGroup } from 'framer-motion';
import { useState } from 'react';
import { Button } from '../components/common/Button';
import { Logo } from '../components/common/Logo';
import { Modal } from '../components/common/Modal';
import { CenterTable } from '../components/game/CenterTable';
import { HandArea } from '../components/game/HandArea';
import { LogPanel } from '../components/game/LogPanel';
import { MyArea } from '../components/game/MyArea';
import { DiscardModal, PendingPrompt } from '../components/game/PendingPrompt';
import { VictoryScreen } from '../components/game/VictoryScreen';
import { OpponentCard } from '../components/players/OpponentCard';
import { OpponentModal } from '../components/players/OpponentModal';
import { useGameView } from '../hooks/useGameView';
import { useIntent } from '../hooks/useIntent';
import { useViewport } from '../hooks/useViewport';
import { completeColors } from '../game-engine/rules/rules';
import { useGame } from '../store/gameStore';

export function Game() {
  const g = useGameView();
  const { role, lobby, skip, backToLobby, leave } = useGame();
  const { mobile, tablet } = useViewport();
  const { send, busy } = useIntent();
  const [peek, setPeek] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  if (!g) return null;
  const { view, me, opponents, isMyTurn, waitingFor, byId } = g;
  const isHost = role === 'host';
  const handW = mobile ? 86 : tablet ? 104 : 118;
  const setW = mobile ? 66 : tablet ? 82 : 92;
  const canEnd = isMyTurn && !view.pending && view.phase === 'play';

  return (
    <LayoutGroup>
      <div className="felt-bg flex min-h-screen flex-col">
        <header className="flex items-center gap-3 px-3 py-2 sm:px-5">
          <Logo size="sm" />
          <span className="hidden rounded-lg bg-black/30 px-2 py-1 text-xs font-bold tracking-widest text-white/60 sm:inline">ROOM {lobby?.code}</span>
          <span className="hidden text-xs text-white/45 md:inline">Turn {view.turnNumber}</span>
          <div className="ml-auto flex gap-2">
            {tablet && (
              <Button size="sm" variant="dark" onClick={() => setShowLog(true)}>
                Log
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => setConfirmLeave(true)}>
              Leave
            </Button>
          </div>
        </header>

        <div className="scrollbar-thin flex gap-3 overflow-x-auto px-3 pb-3 sm:px-5">
          {opponents.map((p) => (
            <OpponentCard key={p.id} p={p} active={view.turnPlayerId === p.id} waiting={waitingFor === p.id && !!view.pending} onClick={() => setPeek(p.id)} />
          ))}
        </div>

        <div className="grid flex-1 gap-4 px-3 sm:px-5 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-3">
            <CenterTable view={view} byId={byId} waitingFor={waitingFor} isHost={isHost} onSkip={skip} pileWidth={mobile ? 64 : 92} />
            <div className="glass rounded-2xl pt-2">
              <div className="flex items-center justify-between px-3 pb-1">
                <div className="text-xs font-bold uppercase tracking-widest text-white/50">
                  Your table · <span className="text-gold-300">{completeColors(me).length}/3 sets</span>
                </div>
                {isMyTurn && me.sets.some((s) => s.cards.some((c) => c.card.type === 'wild')) && <div className="text-[11px] text-white/45">Tap a wild card to move it</div>}
              </div>
              <MyArea me={me} width={setW} canRearrange={isMyTurn && !view.pending && view.phase === 'play'} />
            </div>
          </div>
          {!tablet && <LogPanel log={view.log} className="max-h-[520px] min-h-[300px]" />}
        </div>

        <div className="sticky bottom-0 z-30 mt-3 border-t border-gold-400/20 bg-gradient-to-b from-[#0a2a1a]/95 to-[#041a0f] backdrop-blur">
          <div className="flex items-center gap-3 px-3 pt-2 sm:px-5">
            <div className="text-sm font-bold">
              {isMyTurn ? (
                <span className="text-gold-300">
                  Your turn · {view.playsLeft} play{view.playsLeft === 1 ? '' : 's'} left
                </span>
              ) : (
                <span className="text-white/60">Your hand · {view.hand.length} cards</span>
              )}
            </div>
            <div className="ml-auto">
              <Button variant={view.playsLeft === 0 ? 'gold' : 'ghost'} size={mobile ? 'sm' : 'md'} disabled={!canEnd} loading={busy} onClick={() => send({ type: 'endTurn' })}>
                End turn
              </Button>
            </div>
          </div>
          <HandArea view={view} me={me} isMyTurn={isMyTurn} cardWidth={handW} />
        </div>

        <PendingPrompt view={view} byId={byId} />
        <DiscardModal view={view} />
        <OpponentModal p={peek ? byId(peek) ?? null : null} onClose={() => setPeek(null)} />
        <Modal open={showLog} onClose={() => setShowLog(false)} title="Game log">
          <LogPanel log={view.log} className="h-[60vh]" />
        </Modal>
        <Modal open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Leave the game?">
          <p className="text-white/75">{isHost ? 'You are the host. Leaving ends the match for everyone.' : 'You can rejoin with the same link while the game is running.'}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmLeave(false)}>
              Stay
            </Button>
            <Button variant="danger" onClick={leave}>
              Leave game
            </Button>
          </div>
        </Modal>
        {view.winnerId && <VictoryScreen view={view} isHost={isHost} onLobby={backToLobby} onLeave={leave} />}
      </div>
    </LayoutGroup>
  );
}
