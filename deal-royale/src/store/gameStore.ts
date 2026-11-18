import { create } from 'zustand';
import type { Intent, IntentResult, PlayerView } from '../types/game';
import type { ConnStatus, Lobby } from '../types/net';
import { PROTOCOL_VERSION } from '../types/net';
import { ClientConnection } from '../multiplayer/connectionManager';
import { GameSyncClient } from '../multiplayer/gameSync';
import { normalizeCode, randomToken } from '../multiplayer/peerService';
import { clearHostSnapshot, HostRoom, loadHostSnapshot } from '../multiplayer/roomManager';
import type { HostEvents } from '../multiplayer/roomManager';

export type Screen = 'home' | 'lobby' | 'waiting' | 'game';
export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error' | 'good';
}

interface Store {
  screen: Screen;
  lobbyTab: 'create' | 'join';
  joinCode: string;
  role: 'host' | 'guest' | null;
  status: ConnStatus;
  statusMsg: string;
  signalingOnline: boolean;
  busy: boolean;
  error: string;
  name: string;
  avatar: number;
  myId: string;
  lobby: Lobby | null;
  view: PlayerView | null;
  toasts: Toast[];
  endedReason: string;

  setProfile(name: string, avatar: number): void;
  goHome(): void;
  openLobby(tab: 'create' | 'join', code?: string): void;
  createRoom(): Promise<void>;
  joinRoom(code: string): Promise<void>;
  resumeHosting(): Promise<void>;
  setReady(ready: boolean): void;
  startGame(): void;
  kick(pid: string): void;
  skip(pid: string): void;
  backToLobby(): void;
  leave(): void;
  sendIntent(intent: Intent): Promise<IntentResult>;
  toast(text: string, tone?: Toast['tone']): void;
}

// Live connection objects stay outside React state.
let host: HostRoom | null = null;
let guest: ClientConnection | null = null;
let sync: GameSyncClient | null = null;
let toastSeq = 0;

const PROFILE_KEY = 'dealroyale-profile';
function loadProfile(): { name: string; avatar: number } {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    return { name: typeof p.name === 'string' ? p.name : '', avatar: Number.isInteger(p.avatar) ? p.avatar : Math.floor(Math.random() * 12) };
  } catch {
    return { name: '', avatar: 0 };
  }
}
function tokenFor(code: string): string {
  const key = 'dealroyale-token-' + code;
  try {
    let t = localStorage.getItem(key);
    if (!t) {
      t = randomToken();
      localStorage.setItem(key, t);
    }
    return t;
  } catch {
    return randomToken();
  }
}
export function hasTokenFor(code: string): boolean {
  try {
    return !!localStorage.getItem('dealroyale-token-' + code);
  } catch {
    return false;
  }
}
function setRoomInUrl(code: string | null) {
  try {
    const url = new URL(window.location.href);
    if (code) url.searchParams.set('room', code);
    else url.searchParams.delete('room');
    window.history.replaceState(null, '', url.toString());
  } catch {
    /* ignore */
  }
}

const profile = loadProfile();

export const useGame = create<Store>((set, get) => {
  const hostEvents: HostEvents = {
    onLobby: (lobby) => set({ lobby }),
    onView: (view) => set((s) => ({ view, screen: view ? 'game' : s.screen === 'game' ? 'waiting' : s.screen })),
    onSignaling: (online) => set({ signalingOnline: online }),
    onNotice: (text) => get().toast(text),
  };

  const resetConnections = () => {
    host = null;
    guest = null;
    sync = null;
  };

  return {
    screen: 'home',
    lobbyTab: 'create',
    joinCode: '',
    role: null,
    status: 'idle',
    statusMsg: '',
    signalingOnline: true,
    busy: false,
    error: '',
    name: profile.name,
    avatar: profile.avatar,
    myId: '',
    lobby: null,
    view: null,
    toasts: [],
    endedReason: '',

    setProfile(name, avatar) {
      set({ name, avatar });
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, avatar }));
      } catch {
        /* ignore */
      }
    },

    goHome() {
      set({ screen: 'home', error: '' });
    },

    openLobby(tab, code) {
      set({ screen: 'lobby', lobbyTab: tab, joinCode: code ?? get().joinCode, error: '' });
    },

    async createRoom() {
      if (get().busy) return;
      set({ busy: true, error: '', status: 'connecting', statusMsg: 'Opening your room…', endedReason: '' });
      try {
        clearHostSnapshot();
        host = await HostRoom.create(get().name || 'Host', get().avatar, hostEvents);
        setRoomInUrl(host.code);
        set({ role: 'host', myId: host.me, status: 'connected', busy: false, screen: 'waiting' });
      } catch (e) {
        resetConnections();
        set({ busy: false, status: 'error', error: (e as Error).message || 'Could not create the room.' });
      }
    },

    async resumeHosting() {
      const snap = loadHostSnapshot();
      if (!snap || get().busy) return;
      set({ busy: true, error: '', status: 'connecting', statusMsg: 'Re-opening your room… this can take a few seconds.', screen: 'lobby', lobbyTab: 'create' });
      try {
        host = await HostRoom.resume(snap, hostEvents);
        setRoomInUrl(host.code);
        set({ role: 'host', myId: host.me, status: 'connected', busy: false, screen: host.game ? 'game' : 'waiting' });
        get().toast('Room re-opened. Players will reconnect automatically.', 'good');
      } catch (e) {
        resetConnections();
        clearHostSnapshot();
        set({ busy: false, status: 'error', error: 'Could not re-open the room: ' + ((e as Error).message || 'unknown error') });
      }
    },

    async joinRoom(rawCode) {
      const code = normalizeCode(rawCode);
      if (code.length !== 6) {
        set({ error: 'Room codes are 6 characters long.' });
        return;
      }
      if (get().busy) return;
      set({ busy: true, error: '', status: 'connecting', statusMsg: 'Connecting…', joinCode: code, endedReason: '' });
      const conn = new ClientConnection(
        code,
        { t: 'join', name: get().name || 'Player', avatar: get().avatar, token: tokenFor(code), v: PROTOCOL_VERSION },
        {
          onStatus: (status, statusMsg = '') => {
            set({ status, statusMsg });
            if (status === 'lost') set({ endedReason: statusMsg });
          },
          onMessage: (msg) => {
            if (sync?.handle(msg)) return;
            switch (msg.t) {
              case 'welcome':
                set({ myId: msg.playerId, status: 'connected', statusMsg: '' });
                break;
              case 'lobby':
                set((s) => ({
                  lobby: msg.lobby,
                  screen: msg.lobby.started ? (s.view ? 'game' : s.screen) : s.screen === 'game' || s.screen === 'lobby' ? 'waiting' : s.screen,
                  view: msg.lobby.started ? s.view : null,
                }));
                break;
              case 'view':
                set({ view: msg.view, screen: 'game' });
                break;
              case 'reject':
                guest?.stop(false);
                resetConnections();
                setRoomInUrl(null);
                set({ busy: false, status: 'error', error: msg.reason, screen: 'lobby', lobbyTab: 'join', lobby: null, view: null });
                break;
              case 'closed':
                guest?.stop(false);
                resetConnections();
                set({ status: 'lost', endedReason: msg.reason });
                break;
            }
          },
        },
      );
      guest = conn;
      sync = new GameSyncClient(conn);
      try {
        await conn.start();
        setRoomInUrl(code);
        set((s) => ({ role: 'guest', busy: false, screen: s.screen === 'lobby' || s.screen === 'home' ? 'waiting' : s.screen }));
      } catch (e) {
        resetConnections();
        set({ busy: false, status: 'error', error: (e as Error).message || 'Could not connect to that room.', screen: 'lobby', lobbyTab: 'join' });
      }
    },

    setReady(ready) {
      guest?.send({ t: 'ready', ready });
    },

    startGame() {
      if (!host) return;
      try {
        host.start();
      } catch (e) {
        get().toast((e as Error).message, 'error');
      }
    },

    kick(pid) {
      host?.kick(pid);
    },

    skip(pid) {
      host?.skip(pid);
    },

    backToLobby() {
      host?.backToLobby();
    },

    leave() {
      if (host) host.close();
      if (guest) guest.stop(true);
      resetConnections();
      setRoomInUrl(null);
      set({ role: null, status: 'idle', statusMsg: '', lobby: null, view: null, myId: '', screen: 'home', endedReason: '', error: '' });
    },

    async sendIntent(intent) {
      if (host) return host.hostIntent(intent);
      if (sync) return sync.sendIntent(intent);
      return { ok: false, error: 'Not connected.' };
    },

    toast(text, tone = 'info') {
      const id = ++toastSeq;
      set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), tone === 'error' ? 4500 : 3200);
    },
  };
});

export { loadHostSnapshot };
