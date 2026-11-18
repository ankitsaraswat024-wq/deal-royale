import type { Intent, IntentResult } from '../types/game';
import type { HostMsg } from '../types/net';
import type { ClientConnection } from './connectionManager';

/**
 * Guest-side game sync: sends intents to the host and matches up the host's verdicts.
 * The host validates every move; guests never change game state themselves.
 */
export class GameSyncClient {
  private seq = 0;
  private waiting = new Map<number, { resolve: (r: IntentResult) => void; timer: ReturnType<typeof setTimeout> }>();
  private conn: ClientConnection;

  constructor(conn: ClientConnection) {
    this.conn = conn;
  }

  sendIntent(intent: Intent): Promise<IntentResult> {
    const reqId = ++this.seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.waiting.delete(reqId);
        resolve({ ok: false, error: 'The host did not answer. Check your connection.' });
      }, 10000);
      this.waiting.set(reqId, { resolve, timer });
      this.conn.send({ t: 'intent', reqId, intent });
    });
  }

  /** Returns true if the message was a reply to one of our intents. */
  handle(msg: HostMsg): boolean {
    if (msg.t !== 'result') return false;
    const w = this.waiting.get(msg.reqId);
    if (w) {
      clearTimeout(w.timer);
      this.waiting.delete(msg.reqId);
      w.resolve(msg.result);
    }
    return true;
  }
}
