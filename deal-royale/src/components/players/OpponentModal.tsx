import type { PublicPlayer } from '../../types/game';
import { Modal } from '../common/Modal';
import { BankStack } from '../game/MyArea';
import { SetView } from '../game/SetView';
import { Avatar } from './Avatar';

export function OpponentModal({ p, onClose }: { p: PublicPlayer | null; onClose: () => void }) {
  return (
    <Modal
      open={!!p}
      onClose={onClose}
      wide
      title={
        p && (
          <span className="flex items-center gap-3">
            <Avatar avatar={p.avatar} size={36} online={p.connected} /> {p.name}’s table
          </span>
        )
      }
    >
      {p && (
        <div className="scrollbar-thin flex items-start gap-4 overflow-x-auto pb-2">
          <BankStack player={p} width={78} />
          {p.sets.map((s) => (
            <SetView key={s.color} set={s} width={78} />
          ))}
          {p.sets.length === 0 && <p className="self-center text-white/50">No properties yet.</p>}
        </div>
      )}
      {p && <p className="mt-3 text-sm text-white/50">{p.handCount} cards in hand.</p>}
    </Modal>
  );
}
