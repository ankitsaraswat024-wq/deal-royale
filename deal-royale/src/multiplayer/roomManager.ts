import type Peer from 'peerjs';
import type { GameState, Intent, IntentResult, PlayerView } from '../types/game';
import type { ClientMsg, Lobby } from '../types/net';
import { PROTOCOL_VERSION } from '../types/net';
import { applyIntent, createGame, skipFor, viewFor } from '../game-engine/state/engine';
import { HostConnections } from './connectionManager';
import { hostPeerId, newRoomCode, openPeer, PeerOpenError, randomToken } from './peerService';

const SAVE_KEY = 'dealroyale-host';

export interface HostSnapshot {
  code: string;
  me: string;
  lobby: Lobby;
  game: GameState | null;
  tokens: Record<string, string>; // secret token -> player id
  savedAt: number;
}

export interface HostEvents {
  onLobby(lobby: Lobby): void;
  onView(view: PlayerView | null): void;
  onSignaling(online: boolean): void;
  onNotice(text: string): void;
}

export function loadHostSnapshot(): HostSnapshot | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as HostSnapshot;
    if (Date.now() - snap.savedAt > 6 * 3600_000) return null;
    return snap;
  } catch {
    return null;
  }
}

export function clearHostSnapshot() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** The host owns the lobby and the authoritative game state, and syncs everyone. */
export class HostRoom {
  lobby: Lobby;
  game: GameState | null;
  readonly me: string;
  private tokens: Map<string, string>;
  private conns: HostConnections;
  private ev: HostEvents;

  private constructor(peer: Peer, snap: HostSnapshot, ev: HostEvents) {
    this.lobby = snap.lobby;
    this.game = snap.game;
    this.me = snap.me;
    this.tokens = new Map(Object.entries(snap.tokens));
    this.ev = ev;
    this.conns = new HostConnections(peer, {
      onJoin: (m) => this.handleJoin(m),
      onConnected: (pid) => {
        this.patchPlayer(pid, { connected: true });
        const p = this.lobby.players.find((x) => x.id === pid);
        if (p) this.ev.onNotice(`${p.name} ${this.game ? 'is back online' : 'joined the room'}.`);
        this.sync();
      },
      onDisconnect: (pid) => {
        this.patchPlayer(pid, { connected: false });
        const p = this.lobby.players.find((x) => x.id === pid);
        if (p) this.ev.onNotice(`${p.name} disconnected.`);
        this.sync();
      },
      onMessage: (pid, m) => this.handleMessage(pid, m),
      onSignalingChange: (online) => this.ev.onSignaling(online),
    });
  }

  static async create(name: string, avatar: number, ev: HostEvents): Promise<HostRoom> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = newRoomCode();
      try {
        const peer = await openPeer(hostPeerId(code));
        const me = 'p_' + randomToken(4);
        const snap: HostSnapshot = {
          code,
          me,
          lobby: { code, hostId: me, started: false, maxPlayers: 5, players: [{ id: me, name, avatar, ready: true, connected: true, isHost: true }] },
          game: null,
          tokens: {},
          savedAt: Date.now(),
        };
        const room = new HostRoom(peer, snap, ev);
        room.sync();
        return room;
      } catch (e) {
        lastErr = e;
        if (!(e instanceof PeerOpenError && e.kind === 'unavailable-id')) throw e;
      }
    }
    throw lastErr;
  }

  /** Re-open a room after the host refreshed the page. The room code may take a few seconds to free up. */
  static async resume(snap: HostSnapshot, ev: HostEvents): Promise<HostRoom> {
    const deadline = Date.now() + 45000;
    for (;;) {
      try {
        const peer = await openPeer(hostPeerId(snap.code));
        snap.lobby.players.forEach((p) => (p.connected = p.id === snap.me));
        const room = new HostRoom(peer, snap, ev);
        room.sync();
        return room;
      } catch (e) {
        if (!(e instanceof PeerOpenError && e.kind === 'unavailable-id') || Date.now() > deadline) throw e;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  get code() {
    return this.lobby.code;
  }

  private patchPlayer(pid: string, patch: Partial<Lobby['players'][number]>) {
    const p = this.lobby.players.find((x) => x.id === pid);
    if (p) Object.assign(p, patch);
  }

  private handleJoin(m: Extract<ClientMsg, { t: 'join' }>): { playerId: string } | { reject: string } {
    if (m.v !== PROTOCOL_VERSION) return { reject: 'Your page is out of date. Refresh and try again.' };
    const token = String(m.token || '').slice(0, 64);
    const known = this.tokens.get(token);
    const name = cleanName(m.name);
    const avatar = Number.isInteger(m.avatar) ? Math.abs(m.avatar) % 12 : 0;
    if (known && this.lobby.players.some((p) => p.id === known)) {
      if (!this.lobby.started) this.patchPlayer(known, { name, avatar });
      return { playerId: known };
    }
    if (this.lobby.started) return { reject: 'This game has already started. Ask the host to start a new round.' };
    if (this.lobby.players.length >= this.lobby.maxPlayers) return { reject: 'This room is full (5 players max).' };
    const id = 'p_' + randomToken(4);
    this.tokens.set(token, id);
    this.lobby.players.push({ id, name, avatar, ready: false, connected: false, isHost: false });
    return { playerId: id };
  }

  private handleMessage(pid: string, m: ClientMsg) {
    switch (m.t) {
      case 'ready':
        if (!this.lobby.started) {
          this.patchPlayer(pid, { ready: !!m.ready });
          this.sync();
        }
        return;
      case 'intent': {
        const result = this.applyFor(pid, m.intent);
        this.conns.send(pid, { t: 'result', reqId: m.reqId, result });
        return;
      }
      case 'leave': {
        const p = this.lobby.players.find((x) => x.id === pid);
        if (!this.lobby.started) {
          this.lobby.players = this.lobby.players.filter((x) => x.id !== pid);
          for (const [t, id] of this.tokens) if (id === pid) this.tokens.delete(t);
        } else this.patchPlayer(pid, { connected: false });
        this.conns.drop(pid);
        if (p) this.ev.onNotice(`${p.name} left the room.`);
        this.sync();
        return;
      }
    }
  }

  private applyFor(pid: string, intent: Intent): IntentResult {
    if (!this.game) return { ok: false, error: 'The game has not started yet.' };
    if (!intent || typeof intent !== 'object') return { ok: false, error: 'Invalid move.' };
    const r = applyIntent(this.game, pid, intent);
    if (r.result.ok) {
      this.game = r.state;
      this.sync();
    }
    return r.result;
  }

  // ----- host's own controls -----
  hostIntent(intent: Intent): IntentResult {
    return this.applyFor(this.me, intent);
  }

  canStart(): string | null {
    const ps = this.lobby.players;
    if (ps.length < 2) return 'You need at least 2 players.';
    if (ps.some((p) => !p.connected)) return 'Someone is disconnected.';
    if (ps.some((p) => !p.ready)) return 'Waiting for everyone to be ready.';
    return null;
  }

  start() {
    const why = this.canStart();
    if (why) throw new Error(why);
    this.game = createGame(this.lobby.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })));
    this.lobby.started = true;
    this.sync();
  }

  kick(pid: string) {
    if (this.lobby.started || pid === this.me) return;
    this.lobby.players = this.lobby.players.filter((p) => p.id !== pid);
    for (const [t, id] of this.tokens) if (id === pid) this.tokens.delete(t);
    this.conns.send(pid, { t: 'reject', reason: 'The host removed you from the room.' });
    setTimeout(() => this.conns.drop(pid), 500);
    this.sync();
  }

  skip(pid: string) {
    if (!this.game || this.conns.isConnected(pid) || pid === this.me) return;
    this.game = skipFor(this.game, pid);
    this.sync();
  }

  backToLobby() {
    this.game = null;
    this.lobby.started = false;
    // Drop anyone who is gone; everyone else must ready up again.
    this.lobby.players = this.lobby.players.filter((p) => p.connected);
    this.lobby.players.forEach((p) => (p.ready = p.isHost));
    this.sync();
  }

  isOnline = (pid: string) => pid === this.me || this.conns.isConnected(pid);

  /** Push the lobby and each player's private view to everyone. */
  sync() {
    const lobby = structuredClone(this.lobby);
    this.ev.onLobby(lobby);
    this.conns.broadcast({ t: 'lobby', lobby });
    if (this.game) {
      for (const p of this.lobby.players) {
        if (p.id === this.me) continue;
        this.conns.send(p.id, { t: 'view', view: viewFor(this.game, p.id, this.isOnline) });
      }
      this.ev.onView(viewFor(this.game, this.me, this.isOnline));
    } else this.ev.onView(null);
    this.persist();
  }

  private persist() {
    try {
      const snap: HostSnapshot = { code: this.code, me: this.me, lobby: this.lobby, game: this.game, tokens: Object.fromEntries(this.tokens), savedAt: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
    } catch {
      /* storage unavailable: refresh recovery just won't work */
    }
  }

  close(reason = 'The host closed the room.') {
    this.conns.broadcast({ t: 'closed', reason });
    setTimeout(() => this.conns.destroy(), 400);
    clearHostSnapshot();
  }
}

export function cleanName(raw: unknown): string {
  return (
    String(raw ?? '')
      .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯]/g, '')
      .trim()
      .slice(0, 16) || 'Player'
  );
}
