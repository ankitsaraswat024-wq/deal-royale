import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '../components/common/Button';
import { Logo } from '../components/common/Logo';
import { Avatar } from '../components/players/Avatar';
import { inviteLink } from '../multiplayer/peerService';
import { useGame } from '../store/gameStore';
import { pageTransition } from '../animations/variants';

export function WaitingRoom() {
  const { lobby, myId, role, setReady, startGame, kick, leave, toast, status } = useGame();
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  if (!lobby) {
    return (
      <div className="felt-bg grid min-h-screen place-items-center text-white/70">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" /> Joining room…
        </div>
      </div>
    );
  }
  const link = inviteLink(lobby.code);
  const me = lobby.players.find((p) => p.id === myId);
  const isHost = role === 'host';
  const allReady = lobby.players.length >= 2 && lobby.players.every((p) => p.ready && p.connected);
  const startHint = lobby.players.length < 2 ? 'Waiting for at least one more player…' : !allReady ? 'Waiting for everyone to be ready…' : 'Everyone is ready!';

  const copy = async (what: 'link' | 'code') => {
    const text = what === 'link' ? link : lobby.code;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast(`Copy this: ${text}`);
    }
  };

  const share = async () => {
    const data = { title: 'Deal Royale', text: `Join my Deal Royale room! Code ${lobby.code}`, url: link };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* cancelled */
      }
    }
    copy('link');
  };

  return (
    <motion.div {...pageTransition} className="felt-bg min-h-screen px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo size="sm" />
          <Button size="sm" variant="danger" onClick={leave}>
            {isHost ? 'Close room' : 'Leave'}
          </Button>
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-white/50">Room code</div>
            <button onClick={() => copy('code')} className="mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-[0.25em] text-gold-300 sm:text-6xl" title="Copy code">
              {lobby.code}
            </button>
            <div className="mx-auto mt-4 flex max-w-lg flex-col gap-2 sm:flex-row">
              <input readOnly value={link} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white/80" />
              <Button size="sm" onClick={() => copy('link')}>
                {copied === 'link' ? 'Copied!' : 'Copy invite link'}
              </Button>
              <Button size="sm" variant="ghost" onClick={share}>
                Share
              </Button>
            </div>
            <p className="mt-3 text-xs text-white/50">Send the link to friends. They can join from any device or network.</p>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-white/85">
                Players <span className="text-white/45">{lobby.players.length}/5</span>
              </h2>
              {status === 'reconnecting' && <span className="text-xs text-amber-300">Reconnecting…</span>}
            </div>
            <div className="grid gap-2">
              <AnimatePresence initial={false}>
                {lobby.players.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${p.id === myId ? 'border-gold-400/40 bg-gold-400/10' : 'border-white/10 bg-black/20'}`}
                  >
                    <Avatar avatar={p.avatar} size={44} online={p.connected} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate font-bold">
                        {p.name} {p.id === myId && <span className="text-xs font-semibold text-white/50">(you)</span>}
                        {p.isHost && <span className="rounded-full bg-gold-400/20 px-2 py-0.5 text-[11px] font-bold text-gold-300">👑 HOST</span>}
                      </div>
                      <div className="text-xs text-white/50">{p.connected ? 'Connected' : 'Disconnected'}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.ready ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-white/50'}`}>{p.ready ? 'Ready' : 'Not ready'}</span>
                    {isHost && !p.isHost && (
                      <button onClick={() => kick(p.id)} className="ml-1 rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-500/15" title="Remove player">
                        Remove
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {Array.from({ length: Math.max(0, 2 - lobby.players.length) }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-dashed border-white/15 px-4 py-3 text-white/40">
                  <div className="grid h-11 w-11 place-items-center rounded-full border border-dashed border-white/20">?</div>
                  Waiting for a friend to join…
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            {isHost ? (
              <>
                <Button size="lg" variant="green" disabled={!allReady} onClick={startGame} className="w-full sm:w-auto">
                  Start game
                </Button>
                <p className="text-sm text-white/60">{startHint}</p>
                <p className="max-w-md text-center text-xs text-white/40">You are the host: your browser runs the game. Keep this tab open until the match is over.</p>
              </>
            ) : (
              <>
                <Button size="lg" variant={me?.ready ? 'ghost' : 'green'} onClick={() => setReady(!me?.ready)} className="w-full sm:w-auto">
                  {me?.ready ? 'Not ready' : 'I’m ready'}
                </Button>
                <p className="text-sm text-white/60">{me?.ready ? 'Waiting for the host to start…' : 'Tap ready when you are set.'}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
