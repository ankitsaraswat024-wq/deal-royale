import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: Props) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-gold-400/25 bg-gradient-to-b from-[#123b28] to-[#0a2618] p-5 shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
            initial={{ y: 40, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && <h3 className="mb-4 pr-8 font-[family-name:var(--font-display)] text-xl font-bold text-gold-300">{title}</h3>}
            {onClose && (
              <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/20" aria-label="Close">
                ✕
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
