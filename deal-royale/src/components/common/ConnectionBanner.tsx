import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../store/gameStore';
import { Button } from './Button';
import { Modal } from './Modal';

/** Clear, honest connection state for guests and the host. */
export function ConnectionBanner() {
  const { role, status, statusMsg, endedReason, signalingOnline, leave } = useGame();
  const showReconnect = role === 'guest' && status === 'reconnecting';
  const showSignal = role === 'host' && !signalingOnline;
  const ended = role === 'guest' && status === 'lost';
  return (
    <>
      <AnimatePresence>
        {(showReconnect || showSignal) && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-3 bg-amber-500/95 px-4 py-2 text-sm font-bold text-amber-950 shadow-lg"
          >
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-950 border-t-transparent" />
            {showReconnect ? statusMsg || 'Reconnecting to the host…' : 'Lost contact with the connection service. Current players are fine; new players can’t join until it reconnects.'}
          </motion.div>
        )}
      </AnimatePresence>
      <Modal open={ended} title="Game ended">
        <p className="text-white/85">{endedReason || 'The host is no longer connected.'}</p>
        <p className="mt-3 text-sm text-white/55">
          In Deal Royale the host’s browser runs the match. If the host closes their tab or loses their connection for too long, the game can’t continue. If the host re-opens the game within a minute, you will reconnect automatically.
        </p>
        <div className="mt-5 flex justify-end">
          <Button onClick={leave}>Back to home</Button>
        </div>
      </Modal>
    </>
  );
}
