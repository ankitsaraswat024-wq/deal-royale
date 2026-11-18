import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { ConnectionBanner } from './components/common/ConnectionBanner';
import { Toasts } from './components/common/Toasts';
import { normalizeCode } from './multiplayer/peerService';
import { Game } from './pages/Game';
import { Home } from './pages/Home';
import { Lobby } from './pages/Lobby';
import { WaitingRoom } from './pages/WaitingRoom';
import { hasTokenFor, loadHostSnapshot, useGame } from './store/gameStore';

let booted = false;

export default function App() {
  const screen = useGame((s) => s.screen);

  // Handle invitation links (?room=CODE) and page refreshes.
  useEffect(() => {
    if (booted) return;
    booted = true;
    const code = normalizeCode(new URLSearchParams(window.location.search).get('room') ?? '');
    const st = useGame.getState();
    const snap = loadHostSnapshot();
    if (code && snap && snap.code === code) {
      st.resumeHosting(); // host refreshed the page
    } else if (code.length === 6) {
      if (hasTokenFor(code) && st.name) st.joinRoom(code); // guest refreshed: rejoin same seat
      else st.openLobby('join', code);
    }
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {screen === 'home' && <Home key="home" />}
        {screen === 'lobby' && <Lobby key="lobby" />}
        {screen === 'waiting' && <WaitingRoom key="waiting" />}
        {screen === 'game' && <Game key="game" />}
      </AnimatePresence>
      <ConnectionBanner />
      <Toasts />
    </>
  );
}
