import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'gold' | 'ghost' | 'danger' | 'green' | 'dark';
const styles: Record<Variant, string> = {
  gold: 'bg-gradient-to-b from-gold-300 via-gold-400 to-gold-600 text-[#2a1d05] shadow-[0_8px_24px_rgba(217,169,63,.35),inset_0_1px_0_rgba(255,255,255,.6)]',
  ghost: 'bg-white/5 text-white border border-white/15 hover:bg-white/10',
  danger: 'bg-red-500/15 text-red-200 border border-red-400/40 hover:bg-red-500/25',
  green: 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-emerald-950 shadow-[0_8px_24px_rgba(16,185,129,.3)]',
  dark: 'bg-black/35 text-white border border-white/10 hover:bg-black/50',
};

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
}

export function Button({ children, onClick, variant = 'gold', disabled, loading, size = 'md', className = '', type = 'button', title }: Props) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-7 py-3.5 text-lg' : 'px-5 py-2.5 text-[15px]';
  return (
    <motion.button
      type={type}
      title={title}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold tracking-wide transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${sz} ${styles[variant]} ${className}`}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </motion.button>
  );
}
