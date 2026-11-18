export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const text = size === 'lg' ? 'text-5xl sm:text-7xl' : size === 'sm' ? 'text-xl' : 'text-3xl';
  return (
    <div className="inline-flex items-center gap-3">
      <div className={`relative ${size === 'lg' ? 'h-14 w-14 sm:h-20 sm:w-20' : size === 'sm' ? 'h-8 w-8' : 'h-11 w-11'}`}>
        <div className="absolute inset-0 -rotate-12 rounded-lg border-2 border-gold-400 bg-felt-700" />
        <div className="absolute inset-0 rotate-6 grid place-items-center rounded-lg border-2 border-gold-400 bg-[#fbf8f0] font-[family-name:var(--font-card)] font-extrabold text-felt-700">
          <span className={size === 'lg' ? 'text-2xl sm:text-4xl' : size === 'sm' ? 'text-sm' : 'text-xl'}>₹</span>
        </div>
      </div>
      <span className={`gold-text font-[family-name:var(--font-display)] font-extrabold tracking-wide ${text}`}>Deal Royale</span>
    </div>
  );
}
