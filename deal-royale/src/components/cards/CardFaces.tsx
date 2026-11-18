import type { ActionCard, Card, Color, MoneyCard, PropertyCard, RentCard, WildCard } from '../../types/game';
import { ACTIONS, ALL_COLORS, COLORS } from '../../game-engine/cards/catalog';

const MONEY_TINT: Record<number, [string, string]> = {
  1: ['#e7f3dc', '#9cc98a'],
  2: ['#fbe8c8', '#e2b56b'],
  3: ['#dcebfa', '#89b4e3'],
  4: ['#eedcf7', '#bb8ad6'],
  5: ['#d6f2f1', '#6cc2bd'],
  10: ['#fbe0d9', '#e2866f'],
};

export const RAINBOW = `conic-gradient(${ALL_COLORS.map((c) => COLORS[c].bg).join(',')},${COLORS.brown.bg})`;

function Value({ v, color = '#1a1d1b' }: { v: number; color?: string }) {
  return (
    <div className="dr-value" style={{ color }}>
      {v > 0 ? `₹${v}M` : '—'}
    </div>
  );
}

/** Small decorative skyline in the district's color (original artwork). */
function Skyline({ color, seed }: { color: Color; seed: number }) {
  const c = COLORS[color].bg;
  const hs = [0.55, 0.85, 0.65, 1, 0.5, 0.75, 0.6].map((h, i) => 0.35 + ((h * (seed + 3) * (i + 1)) % 0.65));
  return (
    <svg viewBox="0 0 70 30" className="w-full" style={{ height: '2.6em' }} aria-hidden>
      <rect x="0" y="27" width="70" height="3" fill={c} opacity="0.35" />
      {hs.map((h, i) => {
        const w = 8 + (i % 3);
        const x = 2 + i * 9.6;
        const height = h * 26;
        return (
          <g key={i}>
            <rect x={x} y={27 - height} width={w} height={height} rx="1" fill={c} opacity={0.55 + (i % 3) * 0.15} />
            {Array.from({ length: Math.floor(height / 5) }).map((_, j) => (
              <rect key={j} x={x + 2} y={27 - height + 2 + j * 5} width={w - 4} height="1.4" fill="#fff" opacity="0.55" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function RentTable({ color, compact = false }: { color: Color; compact?: boolean }) {
  const info = COLORS[color];
  return (
    <div style={{ fontSize: compact ? '0.85em' : '1em' }}>
      {info.rent.map((r, i) => (
        <div key={i} className="dr-rent-row">
          <span className="dr-pips">
            {Array.from({ length: i + 1 }).map((_, k) => (
              <i key={k} style={{ background: info.bg, boxShadow: '0 0 0 0.05em rgba(0,0,0,.25)' }} />
            ))}
            {i + 1 === info.setSize && <b style={{ fontSize: '0.75em', marginLeft: '0.2em', color: '#6b5a2a' }}>SET</b>}
          </span>
          <span>₹{r}M</span>
        </div>
      ))}
    </div>
  );
}

export function PropertyFace({ card }: { card: PropertyCard }) {
  const info = COLORS[card.color];
  const seed = card.name.length;
  return (
    <div className="dr-frame" style={{ background: '#fffdf6', boxShadow: `inset 0 0 0 0.12em ${info.bg}` }}>
      <Value v={card.value} color={info.bg} />
      <div style={{ background: info.bg, color: info.fg, padding: '0.45em 0.45em 0.4em 2.75em', height: '3.4em', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ fontSize: '0.58em', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.label}</div>
        <div className="dr-title" style={{ fontSize: '0.98em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {card.name}
        </div>
      </div>
      <div style={{ padding: '0.15em 0.3em 0' }}>
        <Skyline color={card.color} seed={seed} />
      </div>
      <div style={{ padding: '0 0.25em', marginTop: 'auto', marginBottom: '0.3em' }}>
        <div style={{ fontSize: '0.6em', fontWeight: 800, letterSpacing: '0.12em', color: '#7a6a3a', textAlign: 'center', marginBottom: '0.15em' }}>RENT</div>
        <RentTable color={card.color} />
      </div>
    </div>
  );
}

export function WildFace({ card }: { card: WildCard }) {
  if (card.colors === 'any') {
    return (
      <div className="dr-frame" style={{ background: RAINBOW }}>
        <Value v={0} />
        <div className="m-auto grid place-items-center text-center" style={{ background: 'rgba(255,253,246,.94)', borderRadius: '50%', width: '72%', aspectRatio: '1', boxShadow: '0 0.2em 0.6em rgba(0,0,0,.25)' }}>
          <div>
            <div style={{ fontSize: '0.6em', fontWeight: 800, letterSpacing: '0.16em', color: '#7a6a3a' }}>PROPERTY</div>
            <div className="dr-title" style={{ fontSize: '1.35em' }}>
              Rainbow
              <br />
              Wild
            </div>
            <div style={{ fontSize: '0.62em', fontWeight: 600, color: '#444', marginTop: '0.2em', padding: '0 0.6em' }}>Counts as any color. No cash value.</div>
          </div>
        </div>
      </div>
    );
  }
  const [a, b] = card.colors;
  const half = (c: Color, flip: boolean) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', transform: flip ? 'rotate(180deg)' : undefined, background: '#fffdf6' }}>
      <div style={{ background: COLORS[c].bg, color: COLORS[c].fg, padding: '0.3em 0.4em 0.3em 2.6em', minHeight: '2.3em' }}>
        <div style={{ fontSize: '0.6em', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{COLORS[c].label}</div>
      </div>
      <div style={{ padding: '0.1em 0.25em' }}>
        <RentTable color={c} compact />
      </div>
    </div>
  );
  return (
    <div className="dr-frame" style={{ background: '#fffdf6' }}>
      <Value v={card.value} color={COLORS[a].bg} />
      {half(a, false)}
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-card)', fontWeight: 800, fontSize: '0.7em', letterSpacing: '0.25em', padding: '0.15em 0', background: `linear-gradient(90deg, ${COLORS[a].bg}, ${COLORS[b].bg})`, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.4)' }}>
        WILD
      </div>
      {half(b, true)}
    </div>
  );
}

export function RentFace({ card }: { card: RentCard }) {
  const bg = card.colors === 'any' ? RAINBOW : `conic-gradient(${COLORS[card.colors[0]].bg} 0 50%, ${COLORS[card.colors[1]].bg} 50% 100%)`;
  return (
    <div className="dr-frame" style={{ background: 'linear-gradient(180deg,#fffdf6,#f3ecd9)' }}>
      <Value v={card.value} color="#8a6d1f" />
      <div style={{ textAlign: 'right', padding: '0.5em 0.5em 0', fontSize: '0.62em', fontWeight: 800, letterSpacing: '0.18em', color: '#8a6d1f' }}>ACTION</div>
      <div className="mx-auto grid place-items-center" style={{ marginTop: '0.4em', width: '68%', aspectRatio: '1', borderRadius: '50%', background: bg, boxShadow: '0 0 0 0.25em #fff, 0 0 0 0.35em #d9b75e, 0 0.3em 0.8em rgba(0,0,0,.25)' }}>
        <div className="dr-title grid place-items-center" style={{ background: '#fffdf6', borderRadius: '50%', width: '58%', aspectRatio: '1', fontSize: '1.05em', color: '#1a1d1b' }}>
          RENT
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '0.66em', fontWeight: 600, color: '#3b3b3b', padding: '0.6em 0.5em 0', lineHeight: 1.25 }}>
        {card.colors === 'any' ? 'Charge ONE player rent for any color you own.' : `All players pay rent for ${COLORS[card.colors[0]].label} or ${COLORS[card.colors[1]].label}.`}
      </div>
    </div>
  );
}

export function ActionFace({ card }: { card: ActionCard }) {
  const a = ACTIONS[card.action];
  return (
    <div className="dr-frame" style={{ background: `linear-gradient(180deg, ${a.tint}22 0%, #fffdf6 45%)` }}>
      <Value v={card.value} color={a.tint} />
      <div style={{ textAlign: 'right', padding: '0.5em 0.5em 0', fontSize: '0.62em', fontWeight: 800, letterSpacing: '0.18em', color: a.tint }}>ACTION</div>
      <div className="mx-auto grid place-items-center" style={{ marginTop: '0.35em', width: '52%', aspectRatio: '1', borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #fff, ${a.tint}55 70%)`, boxShadow: `0 0 0 0.18em ${a.tint}, 0 0.25em 0.6em rgba(0,0,0,.2)`, fontSize: '2.2em' }}>
        <span style={{ fontSize: '0.9em', lineHeight: 1 }}>{a.icon}</span>
      </div>
      <div className="dr-title text-center" style={{ fontSize: '1.1em', marginTop: '0.4em', color: '#1a1d1b' }}>
        {a.title}
      </div>
      <div style={{ textAlign: 'center', fontSize: '0.62em', fontWeight: 600, color: '#3b3b3b', padding: '0.3em 0.45em 0', lineHeight: 1.25 }}>{a.text}</div>
    </div>
  );
}

export function MoneyFace({ card }: { card: MoneyCard }) {
  const [light, dark] = MONEY_TINT[card.value] ?? MONEY_TINT[1];
  return (
    <div className="dr-frame dr-money-pattern" style={{ background: `linear-gradient(160deg, ${light}, ${dark})` }}>
      <Value v={card.value} color={dark} />
      <div className="m-auto grid place-items-center" style={{ width: '82%', aspectRatio: '1.15', borderRadius: '50%', background: 'rgba(255,255,255,.72)', boxShadow: `0 0 0 0.2em ${dark}, 0 0 0 0.45em rgba(255,255,255,.6)` }}>
        <div className="text-center" style={{ color: '#20302a' }}>
          <div style={{ fontFamily: 'var(--font-card)', fontWeight: 800, fontSize: '2.6em', lineHeight: 1 }}>₹{card.value}</div>
          <div style={{ fontSize: '0.62em', fontWeight: 800, letterSpacing: '0.25em' }}>MILLION</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '0.55em', fontWeight: 800, letterSpacing: '0.3em', paddingBottom: '0.6em', color: '#20302a', opacity: 0.7 }}>ROYALE BANK</div>
    </div>
  );
}

export function CardFace({ card }: { card: Card }) {
  switch (card.type) {
    case 'money':
      return <MoneyFace card={card} />;
    case 'property':
      return <PropertyFace card={card} />;
    case 'wild':
      return <WildFace card={card} />;
    case 'rent':
      return <RentFace card={card} />;
    case 'action':
      return <ActionFace card={card} />;
  }
}

export function CardBackArt() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="text-center" style={{ fontFamily: 'var(--font-display)', color: '#ecc66a', textShadow: '0 1px 2px rgba(0,0,0,.5)' }}>
        <div style={{ fontSize: '1.9em', fontWeight: 800, lineHeight: 1 }}>DR</div>
        <div style={{ fontSize: '0.5em', letterSpacing: '0.3em', marginTop: '0.3em' }}>ROYALE</div>
      </div>
    </div>
  );
}
