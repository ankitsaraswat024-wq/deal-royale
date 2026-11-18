import { motion } from 'framer-motion';
import { Card } from '../components/cards/Card';
import { Button } from '../components/common/Button';
import { Logo } from '../components/common/Logo';
import { fadeUp } from '../animations/variants';
import { useGame, loadHostSnapshot } from '../store/gameStore';
import type { Card as CardT } from '../types/game';

const SHOWCASE: CardT[] = [
  { id: 's1', type: 'property', value: 4, color: 'navy', name: 'Crown Tower' },
  { id: 's2', type: 'action', value: 5, action: 'heist' },
  { id: 's3', type: 'money', value: 5 },
  { id: 's4', type: 'rent', value: 1, colors: ['red', 'yellow'] },
  { id: 's5', type: 'wild', value: 2, colors: ['pink', 'orange'] },
];

const FEATURES = [
  { icon: '🔗', title: 'Invite with a link', text: 'Create a private room and share one link. Friends join from any device, anywhere.' },
  { icon: '⚡', title: 'Peer-to-peer', text: 'Game data flows straight between browsers over WebRTC. No accounts, no sign-up.' },
  { icon: '👥', title: '2–5 players', text: 'Fast rounds of property trading, rent, heists and vetoes for the whole group.' },
  { icon: '📱', title: 'Plays anywhere', text: 'Built for desktop and phone, with big readable cards and touch controls.' },
];

const STEPS = [
  ['Draw 2', 'Start each turn by drawing two cards (five if your hand is empty).'],
  ['Play up to 3', 'Bank money, lay down properties, or play action cards to charge rent and steal.'],
  ['Pay up', 'When someone charges you, pay from your bank and properties. No change is given!'],
  ['Win', 'First player with 3 complete property sets of different colors wins.'],
];

export function Home() {
  const openLobby = useGame((s) => s.openLobby);
  const resume = useGame((s) => s.resumeHosting);
  const snap = loadHostSnapshot();

  return (
    <div className="felt-bg min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo size="sm" />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => openLobby('join')}>
            Join room
          </Button>
          <Button size="sm" onClick={() => openLobby('create')}>
            Create room
          </Button>
        </div>
      </header>

      {snap && (
        <div className="mx-auto mb-2 max-w-6xl px-5">
          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
            <span className="text-sm text-white/85">
              You were hosting room <b className="tracking-widest text-gold-300">{snap.code}</b>
              {snap.game ? ' with a game in progress' : ''}.
            </span>
            <Button size="sm" variant="green" onClick={resume}>
              Resume hosting
            </Button>
          </div>
        </div>
      )}

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 lg:grid-cols-2 lg:pt-16">
        <motion.div initial="hidden" animate="show">
          <motion.div variants={fadeUp} custom={0} className="mb-4 inline-flex rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-gold-300">
            Online multiplayer card game
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-tight sm:text-6xl">
            Collect. Charge rent.
            <br />
            <span className="gold-text">Steal the deal.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-5 max-w-xl text-lg text-white/75">
            Deal Royale is a fast property-trading card game for 2–5 friends. Build sets across Royale City, hit rivals with rent and heists, and be first to three complete sets.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => openLobby('create')}>
              Create a room
            </Button>
            <Button size="lg" variant="ghost" onClick={() => openLobby('join')}>
              I have a code
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} custom={4} className="mt-4 text-sm text-white/50">
            Free · no sign-up · runs in your browser
          </motion.p>
        </motion.div>

        <div className="relative mx-auto h-[340px] w-full max-w-[520px] sm:h-[420px]">
          {SHOWCASE.map((c, i) => {
            const angle = (i - 2) * 11;
            return (
              <motion.div
                key={c.id}
                className="absolute left-1/2 top-1/2"
                initial={{ x: '-50%', y: '-30%', rotate: 0, opacity: 0 }}
                animate={{ x: `calc(-50% + ${(i - 2) * 64}px)`, y: `calc(-50% + ${Math.abs(i - 2) * 16}px)`, rotate: angle, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 120, damping: 14 }}
                whileHover={{ y: `calc(-50% + ${Math.abs(i - 2) * 16 - 24}px)`, zIndex: 10 }}
                style={{ zIndex: i === 2 ? 5 : 5 - Math.abs(i - 2) }}
              >
                <Card card={c} width={150} />
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="glass rounded-2xl p-5">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-bold text-gold-300">{f.title}</h3>
              <p className="mt-1 text-sm text-white/70">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="mb-6 text-center font-[family-name:var(--font-display)] text-3xl font-bold">How to play</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <div key={t} className="glass rounded-2xl p-5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gold-400 font-extrabold text-[#2a1d05]">{i + 1}</div>
              <h3 className="mt-3 font-bold">{t}</h3>
              <p className="mt-1 text-sm text-white/70">{d}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-white/45">
          The room creator’s browser runs the game, so the host should keep their tab open — if the host leaves, the match ends. Peer-to-peer connections work on most home and mobile networks, but some strict office or school networks block them.
        </p>
      </section>
    </div>
  );
}
