import type { Intent, IntentResult, PlayerView } from './game';

export interface LobbyPlayer {
  id: string;
  name: string;
  avatar: number;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface Lobby {
  code: string;
  hostId: string;
  players: LobbyPlayer[];
  started: boolean;
  maxPlayers: number;
}

/** Messages a guest sends to the host. */
export type ClientMsg =
  | { t: 'join'; name: string; avatar: number; token: string; v: number }
  | { t: 'ready'; ready: boolean }
  | { t: 'intent'; reqId: number; intent: Intent }
  | { t: 'ping' }
  | { t: 'leave' };

/** Messages the host sends to a guest. */
export type HostMsg =
  | { t: 'welcome'; playerId: string }
  | { t: 'reject'; reason: string }
  | { t: 'lobby'; lobby: Lobby }
  | { t: 'view'; view: PlayerView }
  | { t: 'result'; reqId: number; result: IntentResult }
  | { t: 'pong' }
  | { t: 'closed'; reason: string };

export const PROTOCOL_VERSION = 1;

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'lost' | 'error';
