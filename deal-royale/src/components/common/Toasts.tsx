import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../store/gameStore';

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className={`max-w-md rounded-xl px-4 py-2.5 text-sm font-semibold shadow-xl backdrop-blur ${
              t.tone === 'error' ? 'bg-red-950/90 text-red-100 ring-1 ring-red-400/40' : t.tone === 'good' ? 'bg-emerald-950/90 text-emerald-100 ring-1 ring-emerald-400/40' : 'bg-black/80 text-white ring-1 ring-white/15'
            }`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
