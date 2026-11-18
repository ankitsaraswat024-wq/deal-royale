export const AVATARS = ['🦁', '🐯', '🦊', '🐼', '🐨', '🐸', '🦉', '🐙', '🦄', '🐲', '🐵', '🐧'];
const RING = ['#f59e0b', '#ef4444', '#f97316', '#64748b', '#94a3b8', '#22c55e', '#a16207', '#ec4899', '#a855f7', '#10b981', '#d97706', '#0ea5e9'];

interface Props {
  avatar: number;
  size?: number;
  online?: boolean;
  active?: boolean;
}

export function Avatar({ avatar, size = 44, online, active }: Props) {
  const i = Math.abs(avatar) % AVATARS.length;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <div
        className={`grid h-full w-full place-items-center rounded-full bg-gradient-to-b from-white/20 to-black/30 ${active ? 'animate-pulse' : ''}`}
        style={{ boxShadow: `0 0 0 ${Math.max(2, size / 16)}px ${active ? '#ecc66a' : RING[i]}`, fontSize: size * 0.55 }}
      >
        {AVATARS[i]}
      </div>
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-[#0a2618] ${online ? 'bg-emerald-400' : 'bg-red-500'}`}
          style={{ width: Math.max(10, size / 4), height: Math.max(10, size / 4) }}
          title={online ? 'Online' : 'Disconnected'}
        />
      )}
    </div>
  );
}
