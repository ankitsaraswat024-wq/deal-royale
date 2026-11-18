import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '../components/common/Button';
import { Logo } from '../components/common/Logo';
import { Avatar, AVATARS } from '../components/players/Avatar';
import { useGame } from '../store/gameStore';
import { pageTransition } from '../animations/variants';

/** Create / join screens with player profile. */
export function Lobby() {
  const { lobbyTab, joinCode, name, avatar, busy, error, statusMsg, setProfile, createRoom, joinRoom, goHome, openLobby } = useGame();
  const [code, setCode] = useState(joinCode);
  const [nm, setNm] = useState(name);
  const ready = nm.trim().length > 0;

  const go = () => {
    if (!ready) return;
    setProfile(nm.trim().slice(0, 16), avatar);
    if (lobbyTab === 'create') createRoom();
    else joinRoom(code);
  };

  return (
    <motion.div {...pageTransition} className="felt-bg min-h-screen px-4 py-6">
      <div className="mx-auto max-w-xl">
        <button onClick={goHome} className="mb-6">
          <Logo size="sm" />
        </button>
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-black/30 p-1">
            {(['create', 'join'] as const).map((t) => (
              <button key={t} onClick={() => openLobby(t, code)} className={`rounded-lg py-2.5 text-sm font-bold transition ${lobbyTab === t ? 'bg-gold-400 text-[#2a1d05]' : 'text-white/70 hover:text-white'}`}>
                {t === 'create' ? 'Create room' : 'Join room'}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              go();
            }}
          >
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-white/50">Your name</label>
            <input
              value={nm}
              onChange={(e) => setNm(e.target.value)}
              maxLength={16}
              placeholder="e.g. Ankit"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-lg font-semibold outline-none focus:border-gold-400"
            />

            <label className="mb-2 mt-5 block text-xs font-bold uppercase tracking-widest text-white/50">Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((_, i) => (
                <button type="button" key={i} onClick={() => setProfile(nm, i)} className={`grid place-items-center rounded-xl p-1.5 transition ${avatar === i ? 'bg-gold-400/25 ring-2 ring-gold-400' : 'hover:bg-white/10'}`}>
                  <Avatar avatar={i} size={40} />
                </button>
              ))}
            </div>

            {lobbyTab === 'join' && (
              <>
                <label className="mb-1 mt-5 block text-xs font-bold uppercase tracking-widest text-white/50">Room code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="ABC123"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-center text-2xl font-extrabold tracking-[0.4em] outline-none focus:border-gold-400"
                />
              </>
            )}

            {error && (
              <div className="mt-5 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
                <b>Couldn’t connect.</b> {error}
                <ul className="mt-2 list-disc pl-5 text-red-100/70">
                  <li>Make sure the host still has the game open.</li>
                  <li>Try a different network (for example, a phone hotspot). Some office/school networks block peer-to-peer.</li>
                  <li>Use an up-to-date Chrome, Edge, Firefox or Safari.</li>
                </ul>
              </div>
            )}
            {busy && <p className="mt-5 text-center text-sm text-white/70">{statusMsg}</p>}

            <Button type="submit" size="lg" className="mt-6 w-full" loading={busy} disabled={!ready || (lobbyTab === 'join' && code.length !== 6)}>
              {lobbyTab === 'create' ? 'Create private room' : 'Join room'}
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
