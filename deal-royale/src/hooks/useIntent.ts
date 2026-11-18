import { useCallback, useState } from 'react';
import type { Intent } from '../types/game';
import { useGame } from '../store/gameStore';

/** Send a move to the host; show the host's error message if it is rejected. */
export function useIntent() {
  const sendIntent = useGame((s) => s.sendIntent);
  const toast = useGame((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const send = useCallback(
    async (intent: Intent) => {
      setBusy(true);
      try {
        const r = await sendIntent(intent);
        if (!r.ok) toast(r.error || 'That move is not allowed.', 'error');
        return r.ok;
      } finally {
        setBusy(false);
      }
    },
    [sendIntent, toast],
  );
  return { send, busy };
}
