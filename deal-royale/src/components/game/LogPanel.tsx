import { useEffect, useRef } from 'react';
import type { LogEntry } from '../../types/game';

export function LogPanel({ log, className = '' }: { log: LogEntry[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [log]);
  return (
    <div className={`glass flex flex-col rounded-2xl ${className}`}>
      <div className="border-b border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/50">Game log</div>
      <div ref={ref} className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto px-4 py-3 text-[13px]">
        {log.map((l) => (
          <div key={l.id} className={l.tone === 'action' ? 'text-gold-300' : l.tone === 'bad' ? 'text-red-200' : l.tone === 'good' ? 'text-emerald-300' : 'text-white/70'}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
