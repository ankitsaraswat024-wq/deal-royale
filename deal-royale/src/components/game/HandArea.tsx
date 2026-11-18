import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Card as CardT, Color, PlayerView, PublicPlayer } from '../../types/game';
import { ACTIONS, cardTitle, COLORS } from '../../game-engine/cards/catalog';
import { wildColors } from '../../game-engine/rules/rules';
import { useIntent } from '../../hooks/useIntent';
import { Card } from '../cards/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ActionComposer } from './ActionComposer';

interface Props {
  view: PlayerView;
  me: PublicPlayer;
  isMyTurn: boolean;
  cardWidth: number;
}

export function HandArea({ view, me, isMyTurn, cardWidth }: Props) {
  const { send, busy } = useIntent();
  const [selected, setSelected] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const firstRender = useRef(true);
  const card = view.hand.find((c) => c.id === selected) ?? null;
  const canPlay = isMyTurn && !view.pending && view.phase === 'play' && view.playsLeft > 0;

  useEffect(() => {
    firstRender.current = false;
    view.hand.forEach((c) => seen.current.add(c.id));
  });
  useEffect(() => {
    if (selected && !view.hand.some((c) => c.id === selected)) {
      setSelected(null);
      setComposing(false);
    }
  }, [view.hand, selected]);

  const close = () => {
    setSelected(null);
    setComposing(false);
  };
  const doSend = async (intent: Parameters<typeof send>[0]) => {
    if (await send(intent)) close();
  };

  const overlap = view.hand.length > 7 ? Math.round(cardWidth * 0.45) : view.hand.length > 5 ? Math.round(cardWidth * 0.3) : -8;

  return (
    <>
      <div className="no-scrollbar flex min-h-[calc(var(--hw)*1.42+28px)] items-end justify-start overflow-x-auto px-3 pb-2 pt-6 sm:justify-center" style={{ ['--hw' as string]: `${cardWidth}px` }}>
        <AnimatePresence initial={false}>
          {view.hand.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40, scale: 0.9 }}
              style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: selected === c.id ? 50 : i }}
            >
              <Card card={c} width={cardWidth} layoutId={c.id} selected={selected === c.id} dealFlip={!firstRender.current && !seen.current.has(c.id)} onClick={() => setSelected(selected === c.id ? null : c.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
        {view.hand.length === 0 && <div className="pb-8 text-sm text-white/40">No cards in hand — you’ll draw 5 next turn.</div>}
      </div>

      <Modal open={!!card} onClose={close} title={card ? (composing ? (card.type === 'rent' ? 'Charge rent' : ACTIONS[(card as { action: keyof typeof ACTIONS }).action]?.title) : cardTitle(card)) : ''} wide={composing}>
        {card &&
          (composing ? (
            <ActionComposer card={card} view={view} me={me} onDone={close} />
          ) : (
            <CardOptions card={card} canPlay={canPlay} isMyTurn={isMyTurn} busy={busy} onSend={doSend} onCompose={() => setComposing(true)} view={view} />
          ))}
      </Modal>
    </>
  );
}

function CardOptions({ card, canPlay, isMyTurn, busy, onSend, onCompose, view }: { card: CardT; canPlay: boolean; isMyTurn: boolean; busy: boolean; onSend: (i: Parameters<ReturnType<typeof useIntent>['send']>[0]) => void; onCompose: () => void; view: PlayerView }) {
  const bankBtn = card.type !== 'property' && card.type !== 'wild' && (
    <Button variant="dark" disabled={!canPlay} loading={busy} onClick={() => onSend({ type: 'bank', cardId: card.id })}>
      🏦 Bank as ₹{card.value}M
    </Button>
  );
  let options: React.ReactNode = null;
  if (card.type === 'money') options = bankBtn;
  else if (card.type === 'property')
    options = (
      <Button disabled={!canPlay} loading={busy} onClick={() => onSend({ type: 'playProperty', cardId: card.id, color: card.color })}>
        Play to {COLORS[card.color].label}
      </Button>
    );
  else if (card.type === 'wild')
    options = (
      <div className="grid grid-cols-2 gap-2">
        {wildColors(card).map((c: Color) => (
          <Button key={c} size="sm" variant="dark" disabled={!canPlay} onClick={() => onSend({ type: 'playProperty', cardId: card.id, color: c })}>
            <span className="h-3.5 w-2.5 rounded-sm" style={{ background: COLORS[c].bg }} />
            {COLORS[c].label}
          </Button>
        ))}
      </div>
    );
  else if (card.type === 'rent')
    options = (
      <>
        <Button disabled={!canPlay} onClick={onCompose}>
          💰 Charge rent
        </Button>
        {bankBtn}
      </>
    );
  else {
    const a = card.action;
    const playable = a !== 'veto' && a !== 'boost';
    options = (
      <>
        {playable && (
          <Button disabled={!canPlay} onClick={onCompose}>
            {ACTIONS[a].icon} Play {ACTIONS[a].title}
          </Button>
        )}
        {bankBtn}
        {!playable && <p className="text-xs text-white/55">{a === 'veto' ? 'Keep Veto in your hand — you’ll be asked if you want to use it when someone plays an action against you.' : 'Choose “Charge rent” on a Rent card to use your Rent Boost.'}</p>}
      </>
    );
  }
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <Card card={card} width={170} />
      <div className="flex w-full flex-1 flex-col gap-2">
        {!isMyTurn && <p className="rounded-xl bg-black/30 p-3 text-sm text-white/70">It’s not your turn yet.</p>}
        {isMyTurn && view.pending && <p className="rounded-xl bg-black/30 p-3 text-sm text-white/70">Waiting for other players to respond…</p>}
        {isMyTurn && !view.pending && view.playsLeft === 0 && <p className="rounded-xl bg-black/30 p-3 text-sm text-white/70">You’ve used all 3 plays. End your turn.</p>}
        {options}
      </div>
    </div>
  );
}
