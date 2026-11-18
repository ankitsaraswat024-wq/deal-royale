import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { Card as CardT } from '../../types/game';
import { CardBackArt, CardFace } from './CardFaces';

interface Props {
  card: CardT | null; // null = face down
  width?: number;
  selected?: boolean;
  dimmed?: boolean;
  /** Show the card upside-down (a wild card being used as its second color). */
  rotated?: boolean;
  /** Animate a flip from face-down to face-up when it first appears. */
  dealFlip?: boolean;
  onClick?: () => void;
  layoutId?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function Card({ card, width = 110, selected, dimmed, rotated, dealFlip, onClick, layoutId, className = '', style, title }: Props) {
  const faceDown = card === null;
  const interactive = !!onClick;
  return (
    <motion.div
      layoutId={layoutId}
      layout={layoutId ? 'position' : undefined}
      className={`dr-card ${interactive ? 'cursor-pointer' : ''} ${className}`}
      style={{ ['--cw' as string]: `${width}px`, ...style }}
      initial={dealFlip ? { y: -40, opacity: 0 } : false}
      animate={{ y: selected ? -Math.round(width * 0.16) : 0, opacity: dimmed ? 0.45 : 1, rotate: rotated ? 180 : 0 }}
      whileHover={interactive ? { y: selected ? -Math.round(width * 0.18) : -Math.round(width * 0.08), scale: 1.03 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      onClick={onClick}
      title={title}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick?.()) : undefined}
    >
      <motion.div
        className="dr-card-inner"
        initial={dealFlip ? { rotateY: 180 } : false}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1], delay: dealFlip ? 0.15 : 0 }}
      >
        <div className="dr-face" style={selected ? { boxShadow: '0 0 0 0.22em #ecc66a, 0 0 1.4em rgba(236,198,106,.7), 0 0.5em 1.2em rgba(0,0,0,.4)' } : undefined}>
          {card && <CardFace card={card} />}
        </div>
        <div className="dr-back">
          <CardBackArt />
        </div>
      </motion.div>
    </motion.div>
  );
}

/** A compact colored chip used to summarise properties in small spaces. */
export function ColorChip({ color, size = 12, title }: { color: string; size?: number; title?: string }) {
  return <span title={title} className="inline-block rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,.35)]" style={{ width: size * 0.72, height: size, background: color }} />;
}
