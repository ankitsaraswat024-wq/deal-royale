import { useMemo } from 'react';
import { useGame } from '../store/gameStore';
import { waitingOn } from '../game-engine/state/engine';

export function useGameView() {
  const view = useGame((s) => s.view);
  return useMemo(() => {
    if (!view) return null;
    const me = view.players.find((p) => p.id === view.you)!;
    const opponents = view.players.filter((p) => p.id !== view.you);
    const isMyTurn = view.turnPlayerId === view.you && view.phase !== 'over';
    const waitingFor = waitingOn(view);
    const byId = (id: string) => view.players.find((p) => p.id === id);
    return { view, me, opponents, isMyTurn, waitingFor, byId };
  }, [view]);
}

