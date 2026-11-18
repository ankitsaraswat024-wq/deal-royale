import Peer from 'peerjs';
import type { PeerOptions } from 'peerjs';

/**
 * PeerJS setup. By default this uses the free PeerJS Cloud signaling server
 * (0.peerjs.com) only to introduce browsers to each other; all game data then flows
 * directly between browsers over WebRTC data channels.
 *
 * Optional environment variables (set in Vercel/Netlify or a .env file):
 *   VITE_PEER_HOST, VITE_PEER_PORT, VITE_PEER_PATH, VITE_PEER_SECURE  – use another PeerJS server
 *   VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL         – add your own TURN relay
 */
export const ID_PREFIX = 'dealroyale-v1-';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newRoomCode(): string {
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join('');
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export const hostPeerId = (code: string) => ID_PREFIX + code.toLowerCase();

export function inviteLink(code: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', code);
  return url.toString();
}

export function randomToken(len = 16): string {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function peerOptions(): PeerOptions {
  const env = import.meta.env;
  const opts: PeerOptions = { debug: 1 };
  if (env.VITE_PEER_HOST) {
    opts.host = env.VITE_PEER_HOST;
    if (env.VITE_PEER_PORT) opts.port = Number(env.VITE_PEER_PORT);
    if (env.VITE_PEER_PATH) opts.path = env.VITE_PEER_PATH;
    opts.secure = env.VITE_PEER_SECURE ? env.VITE_PEER_SECURE === 'true' : window.location.protocol === 'https:';
  }
  if (env.VITE_TURN_URL) {
    opts.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: env.VITE_TURN_URL, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL },
      ],
    };
  }
  return opts;
}

export class PeerOpenError extends Error {
  kind: string;
  constructor(kind: string, message: string) {
    super(message);
    this.kind = kind;
  }
}

export function friendlyPeerError(type: string): string {
  switch (type) {
    case 'unavailable-id':
      return 'That room code is already in use.';
    case 'peer-unavailable':
      return 'Room not found. Check the code — the host must keep the game open.';
    case 'browser-incompatible':
      return 'This browser does not support peer-to-peer connections. Try Chrome, Edge, Firefox or Safari.';
    case 'network':
    case 'socket-error':
    case 'socket-closed':
    case 'server-error':
      return 'Could not reach the connection service. Check your internet connection and try again.';
    case 'timeout':
      return 'Connection timed out. Some networks block peer-to-peer games — try another Wi-Fi or a mobile hotspot.';
    default:
      return 'Connection problem. Please try again.';
  }
}

/** Create a Peer and wait until it is registered with the signaling server. */
export function openPeer(id?: string, timeoutMs = 15000): Promise<Peer> {
  return new Promise((resolve, reject) => {
    if (typeof RTCPeerConnection === 'undefined') {
      reject(new PeerOpenError('browser-incompatible', friendlyPeerError('browser-incompatible')));
      return;
    }
    const peer = id ? new Peer(id, peerOptions()) : new Peer(peerOptions());
    const timer = setTimeout(() => {
      peer.destroy();
      reject(new PeerOpenError('timeout', friendlyPeerError('timeout')));
    }, timeoutMs);
    const onError = (err: { type?: string }) => {
      clearTimeout(timer);
      peer.destroy();
      reject(new PeerOpenError(err.type ?? 'unknown', friendlyPeerError(err.type ?? '')));
    };
    peer.once('error', onError);
    peer.once('open', () => {
      clearTimeout(timer);
      peer.off('error', onError);
      resolve(peer);
    });
  });
}
