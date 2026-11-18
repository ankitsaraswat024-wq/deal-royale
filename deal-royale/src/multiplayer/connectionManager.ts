import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { ClientMsg, ConnStatus, HostMsg } from '../types/net';
import { friendlyPeerError, hostPeerId, openPeer, PeerOpenError } from './peerService';

const PING_EVERY = 4000;
const DEAD_AFTER = 13000;
const RECONNECT_FOR = 60000;

/* ======================================================================
   HOST side: accepts guest connections, tracks who is online.
   ====================================================================== */
export interface HostHandlers {
  onJoin(msg: Extract<ClientMsg, { t: 'join' }>): { playerId: string } | { reject: string };
  onConnected(playerId: string): void;
  onMessage(playerId: string, msg: ClientMsg): void;
  onDisconnect(playerId: string): void;
  onSignalingChange?(online: boolean): void;
}

export class HostConnections {
  private conns = new Map<string, DataConnection>();
  private lastSeen = new Map<string, number>();
  private sweepTimer: ReturnType<typeof setInterval>;
  private peer: Peer;
  private h: HostHandlers;

  constructor(peer: Peer, handlers: HostHandlers) {
    this.peer = peer;
    this.h = handlers;
    peer.on('connection', (conn) => this.accept(conn));
    // Losing the signaling server does not break existing games, but new players can't join until we reconnect.
    peer.on('disconnected', () => {
      this.h.onSignalingChange?.(false);
      const retry = () => {
        if (this.peer.destroyed || !this.peer.disconnected) return;
        try {
          this.peer.reconnect();
        } catch {
          /* ignore */
        }
        setTimeout(retry, 5000);
      };
      setTimeout(retry, 1000);
    });
    peer.on('open', () => this.h.onSignalingChange?.(true));
    peer.on('error', (e) => console.warn('[host peer]', e.type, e));
    this.sweepTimer = setInterval(() => this.sweep(), 3000);
  }

  private accept(conn: DataConnection) {
    let pid: string | null = null;
    const joinTimer = setTimeout(() => {
      if (!pid) conn.close();
    }, 20000);
    conn.on('data', (raw) => {
      const msg = raw as ClientMsg;
      if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
      if (!pid) {
        if (msg.t !== 'join') return;
        const r = this.h.onJoin(msg);
        if ('reject' in r) {
          safeSend(conn, { t: 'reject', reason: r.reject });
          setTimeout(() => conn.close(), 800);
          return;
        }
        pid = r.playerId;
        clearTimeout(joinTimer);
        const old = this.conns.get(pid);
        this.conns.set(pid, conn);
        if (old && old !== conn) old.close();
        this.lastSeen.set(pid, Date.now());
        safeSend(conn, { t: 'welcome', playerId: pid });
        this.h.onConnected(pid);
        return;
      }
      this.lastSeen.set(pid, Date.now());
      if (msg.t === 'ping') {
        safeSend(conn, { t: 'pong' });
        return;
      }
      this.h.onMessage(pid, msg);
    });
    const drop = () => {
      clearTimeout(joinTimer);
      if (pid && this.conns.get(pid) === conn) {
        this.conns.delete(pid);
        this.h.onDisconnect(pid);
      }
    };
    conn.on('close', drop);
    conn.on('error', drop);
  }

  private sweep() {
    const now = Date.now();
    for (const [pid, conn] of this.conns) {
      if (now - (this.lastSeen.get(pid) ?? 0) > DEAD_AFTER) {
        this.conns.delete(pid);
        conn.close();
        this.h.onDisconnect(pid);
      }
    }
  }

  isConnected(pid: string) {
    return this.conns.has(pid);
  }

  send(pid: string, msg: HostMsg) {
    const c = this.conns.get(pid);
    if (c) safeSend(c, msg);
  }

  broadcast(msg: HostMsg) {
    for (const c of this.conns.values()) safeSend(c, msg);
  }

  drop(pid: string) {
    const c = this.conns.get(pid);
    this.conns.delete(pid);
    c?.close();
  }

  destroy() {
    clearInterval(this.sweepTimer);
    for (const c of this.conns.values()) c.close();
    this.conns.clear();
    this.peer.destroy();
  }
}

function safeSend(conn: DataConnection, msg: HostMsg | ClientMsg) {
  try {
    if (conn.open) conn.send(msg);
  } catch (e) {
    console.warn('send failed', e);
  }
}

/* ======================================================================
   GUEST side: one connection to the host, with heartbeat and reconnection.
   ====================================================================== */
export interface ClientHandlers {
  onStatus(status: ConnStatus, message?: string): void;
  onMessage(msg: HostMsg): void;
}

export class ClientConnection {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private lastHeard = 0;
  private hbTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private reconnecting = false;
  private code: string;
  private hello: Extract<ClientMsg, { t: 'join' }>;
  private h: ClientHandlers;

  constructor(code: string, hello: Extract<ClientMsg, { t: 'join' }>, handlers: ClientHandlers) {
    this.code = code;
    this.hello = hello;
    this.h = handlers;
  }

  /** Connect for the first time. Rejects with a friendly message if the room can't be reached. */
  async start(): Promise<void> {
    this.h.onStatus('connecting', 'Contacting the connection service…');
    this.peer = await openPeer();
    this.peer.on('disconnected', () => {
      if (!this.stopped && this.peer && !this.peer.destroyed) setTimeout(() => this.peer?.reconnect(), 1000);
    });
    this.peer.on('error', (e) => console.warn('[guest peer]', e.type));
    this.h.onStatus('connecting', 'Connecting directly to the host…');
    try {
      await this.connectOnce();
    } catch (e) {
      this.stop(false);
      throw e;
    }
    this.hbTimer = setInterval(() => this.heartbeat(), PING_EVERY);
  }

  private connectOnce(timeoutMs = 20000): Promise<void> {
    return new Promise((resolve, reject) => {
      const peer = this.peer!;
      const conn = peer.connect(hostPeerId(this.code), { reliable: true, serialization: 'json' });
      let settled = false;
      const finish = (err?: PeerOpenError) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        peer.off('error', onPeerErr);
        if (err) {
          conn.close();
          reject(err);
        } else resolve();
      };
      const timer = setTimeout(() => finish(new PeerOpenError('timeout', friendlyPeerError('timeout'))), timeoutMs);
      const onPeerErr = (e: { type?: string }) => {
        if (e.type === 'peer-unavailable' || e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error')
          finish(new PeerOpenError(e.type, friendlyPeerError(e.type)));
      };
      peer.on('error', onPeerErr);
      conn.on('open', () => {
        this.conn = conn;
        this.lastHeard = Date.now();
        conn.send(this.hello);
        finish();
      });
      conn.on('data', (raw) => {
        this.lastHeard = Date.now();
        const msg = raw as HostMsg;
        if (!msg || typeof msg !== 'object') return;
        if (msg.t === 'pong') return;
        if (msg.t === 'closed' || msg.t === 'reject') this.stopped = true;
        this.h.onMessage(msg);
      });
      const onDrop = () => {
        if (this.conn !== conn) return;
        this.conn = null;
        if (!this.stopped) this.reconnectLoop();
      };
      conn.on('close', onDrop);
      conn.on('error', onDrop);
    });
  }

  private heartbeat() {
    if (!this.conn) return;
    if (Date.now() - this.lastHeard > DEAD_AFTER) {
      const c = this.conn;
      this.conn = null;
      c.close();
      if (!this.stopped) this.reconnectLoop();
      return;
    }
    this.send({ t: 'ping' });
  }

  private async reconnectLoop() {
    if (this.reconnecting || this.stopped) return;
    this.reconnecting = true;
    this.h.onStatus('reconnecting', 'Connection to the host dropped. Reconnecting…');
    const deadline = Date.now() + RECONNECT_FOR;
    while (!this.stopped && Date.now() < deadline) {
      try {
        if (!this.peer || this.peer.destroyed) this.peer = await openPeer();
        await this.connectOnce(8000);
        this.reconnecting = false;
        this.h.onStatus('connected');
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    this.reconnecting = false;
    if (!this.stopped) {
      this.h.onStatus('lost', 'The host is no longer reachable. The host’s browser runs the game, so the match has ended.');
      this.stop(false);
    }
  }

  send(msg: ClientMsg) {
    if (this.conn) safeSend(this.conn, msg);
  }

  stop(sayGoodbye = true) {
    if (sayGoodbye) this.send({ t: 'leave' });
    this.stopped = true;
    if (this.hbTimer) clearInterval(this.hbTimer);
    const peer = this.peer;
    setTimeout(() => peer?.destroy(), sayGoodbye ? 300 : 0);
    this.peer = null;
    this.conn = null;
  }
}
