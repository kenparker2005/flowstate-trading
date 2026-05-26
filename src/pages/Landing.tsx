import { Link } from 'react-router-dom';

// ── Simulator mockup candle data ──────────────────────────────────────────────
// [open, high, low, close] — ES M1 trending up from ~4760
const MOCK_CANDLES: [number, number, number, number][] = [
  [4760, 4766, 4757, 4763],
  [4763, 4769, 4761, 4768],
  [4768, 4770, 4762, 4764],
  [4764, 4767, 4761, 4766],
  [4766, 4773, 4764, 4771],
  [4771, 4776, 4768, 4774],
  [4774, 4777, 4768, 4770],
  [4770, 4774, 4767, 4772],
  [4772, 4780, 4771, 4778],
  [4778, 4783, 4775, 4781],
  [4781, 4784, 4773, 4775],
  [4775, 4779, 4772, 4777],
  [4777, 4785, 4776, 4783],
  [4783, 4790, 4781, 4788],
  [4788, 4791, 4781, 4783],
  [4783, 4787, 4780, 4785],
  [4785, 4792, 4783, 4790],
  [4790, 4796, 4788, 4794],
  [4794, 4797, 4788, 4790],
  [4790, 4795, 4788, 4793],
  [4793, 4800, 4791, 4798],
];

const SVG_W = 460, SVG_H = 130, PAD = 8;
const MIN_P = 4754, MAX_P = 4804, RANGE = MAX_P - MIN_P;
const SLOT = SVG_W / MOCK_CANDLES.length;
const BODY_W = Math.max(2, Math.floor(SLOT * 0.6));

function py(price: number) {
  return PAD + ((MAX_P - price) / RANGE) * (SVG_H - PAD * 2);
}

// ── Icon components ───────────────────────────────────────────────────────────
function IconLayers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  );
}
function IconPulse() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  );
}
function IconDollar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  );
}
function IconEyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

const FEATURES = [
  {
    Icon: IconLayers,
    title: 'No complexity',
    desc: 'Other platforms overwhelm you with features you don\'t need. FlowState is built for one thing: deliberate practice with real market data.',
  },
  {
    Icon: IconPulse,
    title: 'Honest feedback',
    desc: 'No inflated stats, no gamification tricks. Real win rates, real P&L, and real patterns in your trading behavior — nothing more.',
  },
  {
    Icon: IconCheck,
    title: 'Your strategy, your rules',
    desc: 'Set up your bias checklist, risk parameters, and focus areas. Practice what you actually trade, not what a course tells you.',
  },
  {
    Icon: IconDollar,
    title: 'Affordable',
    desc: '$5/month. Not $50, not $100. Trading practice shouldn\'t cost more than your Netflix subscription.',
  },
  {
    Icon: IconEyeOff,
    title: 'Hidden dates by default',
    desc: 'Trade blind to avoid recency bias. Or pick a specific date when you want to study a particular setup or market event.',
  },
  {
    Icon: IconBarChart,
    title: 'ES & NQ futures data',
    desc: 'Practice on the most liquid futures markets in the world. Real tick structure, authentic session behavior, and multi-timeframe replay.',
  },
];

const PLAN_FEATURES = [
  'Unlimited practice sessions',
  'ES & NQ futures data',
  'Trade history & analytics',
  'Bias checklist & strategy notes',
];

// ── Main component ────────────────────────────────────────────────────────────
export function Landing() {
  const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID as string;
  const annualPriceId  = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID  as string;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sticky Nav ────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #F3F4F6',
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.03em', color: '#111827' }}>
          FlowState<span style={{ color: '#2962FF' }}>Trading</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <a href="#about" style={{
            fontWeight: 500, fontSize: 14, color: '#6B7280', textDecoration: 'none',
            padding: '7px 14px', borderRadius: 8,
          }}>
            About
          </a>
          <a href="#pricing" style={{
            fontWeight: 500, fontSize: 14, color: '#6B7280', textDecoration: 'none',
            padding: '7px 14px', borderRadius: 8,
          }}>
            Pricing
          </a>
          <div style={{ width: 1, height: 16, background: '#E5E7EB', margin: '0 8px' }} />
          <Link to="/login" style={{
            fontWeight: 500, fontSize: 14, color: '#6B7280', textDecoration: 'none',
            padding: '7px 14px', borderRadius: 8,
          }}>
            Log in
          </Link>
          <Link to="/signup" style={{
            fontWeight: 600, fontSize: 14, color: '#fff', textDecoration: 'none',
            padding: '8px 18px', borderRadius: 10,
            background: 'linear-gradient(135deg, #2962FF 0%, #1A53FF 100%)',
            boxShadow: '0 2px 8px rgba(41,98,255,0.30)',
          }}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 32px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Blue glow behind headline */}
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 340,
          background: 'radial-gradient(ellipse at center, rgba(41,98,255,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', color: '#2962FF',
            borderRadius: 999, padding: '6px 16px',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase', marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2962FF', display: 'inline-block' }} />
            Futures replay simulator
          </div>

          <h1 style={{
            fontSize: 'clamp(42px, 6.5vw, 68px)',
            fontWeight: 800, lineHeight: 1.08,
            letterSpacing: '-0.04em', color: '#111827',
            marginBottom: 24,
          }}>
            Practice like a pro.<br />
            <span style={{ color: '#2962FF' }}>Trade like one.</span>
          </h1>

          <p style={{
            fontSize: 19, color: '#6B7280', lineHeight: 1.65,
            maxWidth: 500, margin: '0 auto 40px', fontWeight: 400,
          }}>
            Master your strategy with real market data. No risk. No complexity. Just results.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <Link to="/signup" style={{
              fontWeight: 700, fontSize: 15, color: '#fff', textDecoration: 'none',
              padding: '14px 32px', borderRadius: 12,
              background: 'linear-gradient(135deg, #2962FF 0%, #1A53FF 100%)',
              boxShadow: '0 4px 20px rgba(41,98,255,0.35)',
              letterSpacing: '-0.01em',
            }}>
              Start free trial
            </Link>
            <a href="#about" style={{
              fontWeight: 600, fontSize: 15, color: '#374151', textDecoration: 'none',
              padding: '14px 32px', borderRadius: 12,
              border: '1.5px solid #E5E7EB', background: '#fff',
            }}>
              See how it works
            </a>
          </div>

          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 72 }}>
            No credit card required · 7-day free trial · Cancel anytime
          </p>
        </div>

        {/* ── Simulator mockup ──────────────────────────────────────────── */}
        <div style={{
          maxWidth: 900, margin: '0 auto',
          borderRadius: '20px 20px 0 0',
          overflow: 'hidden',
          boxShadow: '0 -4px 0 4px rgba(41,98,255,0.06), 0 32px 80px rgba(0,0,0,0.18)',
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#0F172A',
        }}>
          {/* Mockup header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 16px', height: 48,
            background: '#1E293B', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', gap: 6, marginRight: 12 }}>
              {['#FF5F57', '#FEBC2E', '#28C840'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#94A3B8', letterSpacing: '-0.02em' }}>
              FlowState<span style={{ color: '#4F8EFF' }}>Trading</span>
            </div>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {['ES', 'NQ'].map((p, i) => (
                <div key={p} style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: i === 0 ? '#2962FF' : 'transparent',
                  color: i === 0 ? '#fff' : '#64748B',
                }}>
                  {p}
                </div>
              ))}
            </div>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
            <div style={{ display: 'flex', gap: 3 }}>
              {['1m', '5m', '15m', '1h', '4h'].map((tf, i) => (
                <div key={tf} style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: i === 0 ? 'rgba(41,98,255,0.2)' : 'transparent',
                  color: i === 0 ? '#4F8EFF' : '#475569',
                }}>
                  {tf}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{
              padding: '4px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.1)', color: '#64748B',
            }}>
              New session
            </div>
          </div>

          {/* Mockup body */}
          <div style={{ display: 'flex', height: 240 }}>
            {/* Chart area */}
            <div style={{ flex: 1, position: 'relative', padding: '12px 8px 8px 40px', overflow: 'hidden' }}>
              {/* Y-axis price labels */}
              {[4800, 4790, 4780, 4770, 4760].map(p => (
                <div key={p} style={{
                  position: 'absolute', left: 0, width: 36, textAlign: 'right',
                  top: PAD + ((MAX_P - p) / RANGE) * (SVG_H - PAD * 2) + 12 - 8,
                  fontSize: 9, color: '#475569', fontWeight: 500,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {p}
                </div>
              ))}
              {/* Candlestick SVG */}
              <svg
                width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                style={{ display: 'block', overflow: 'visible' }}
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                {[4800, 4790, 4780, 4770, 4760].map(p => (
                  <line key={p}
                    x1={0} y1={py(p)} x2={SVG_W} y2={py(p)}
                    stroke="rgba(255,255,255,0.04)" strokeWidth="1"
                  />
                ))}
                {/* Candles */}
                {MOCK_CANDLES.map(([o, h, l, c], i) => {
                  const isGreen = c >= o;
                  const color = isGreen ? '#22C55E' : '#EF4444';
                  const bodyTop    = py(Math.max(o, c));
                  const bodyBottom = py(Math.min(o, c));
                  const bodyH      = Math.max(1.5, bodyBottom - bodyTop);
                  const slotX      = i * SLOT;
                  const bodyX      = slotX + (SLOT - BODY_W) / 2;
                  const wickX      = slotX + SLOT / 2;
                  return (
                    <g key={i}>
                      <line x1={wickX} y1={py(h)} x2={wickX} y2={py(l)} stroke={color} strokeWidth="1" />
                      <rect x={bodyX} y={bodyTop} width={BODY_W} height={bodyH} fill={color} rx="0.5" />
                    </g>
                  );
                })}
                {/* Current price line */}
                <line x1={0} y1={py(4797)} x2={SVG_W} y2={py(4797)} stroke="#4F8EFF" strokeWidth="1" strokeDasharray="3 3" />
                <rect x={SVG_W - 52} y={py(4797) - 8} width={52} height={16} fill="#2962FF" rx="3" />
                <text x={SVG_W - 26} y={py(4797) + 4.5} textAnchor="middle" fontSize="8" fill="white" fontWeight="700" fontFamily="JetBrains Mono, monospace">4797.00</text>
              </svg>
            </div>

            {/* Trade panel */}
            <div style={{
              width: 160, flexShrink: 0,
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div>
                <div style={{ fontSize: 9, color: '#475569', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Current price</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.03em', fontFamily: 'JetBrains Mono, monospace' }}>4,797.00</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{
                  flex: 1, textAlign: 'center', padding: '7px 0',
                  borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: 'rgba(34,197,94,0.15)', color: '#22C55E',
                }}>Long</div>
                <div style={{
                  flex: 1, textAlign: 'center', padding: '7px 0',
                  borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: 'rgba(239,68,68,0.10)', color: '#475569',
                }}>Short</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#475569', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>STOP LOSS</div>
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, padding: '5px 10px',
                  fontSize: 12, color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace',
                }}>4,790.00</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#475569', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>TAKE PROFIT</div>
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, padding: '5px 10px',
                  fontSize: 12, color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace',
                }}>4,818.00</div>
              </div>
              <div style={{
                marginTop: 'auto', padding: '7px 0', borderRadius: 8, textAlign: 'center',
                background: 'linear-gradient(135deg, #2962FF, #1A53FF)',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                Enter Long
              </div>
            </div>
          </div>

          {/* Mockup controls */}
          <div style={{
            height: 40, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 48, paddingRight: 16,
            borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0B1120',
          }}>
            {['◀ 1', '◀ 5', '+1 ▶', '+5 ▶'].map(label => (
              <div key={label} style={{
                padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 11, fontWeight: 600, color: '#64748B',
              }}>
                {label}
              </div>
            ))}
            <div style={{
              padding: '4px 14px', borderRadius: 6,
              background: 'rgba(41,98,255,0.15)', border: '1px solid rgba(41,98,255,0.2)',
              fontSize: 11, fontWeight: 700, color: '#4F8EFF',
            }}>
              Auto ▷
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 10, color: '#334155' }}>Bar 101 / 2,840</div>
          </div>
        </div>
      </section>

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <section id="about" style={{ background: '#F8F9FA', padding: '112px 32px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB',
              borderRadius: 999, padding: '5px 16px',
              fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
              textTransform: 'uppercase', marginBottom: 20,
            }}>
              Why FlowState
            </div>
            <h2 style={{
              fontSize: 'clamp(30px, 4.5vw, 44px)',
              fontWeight: 800, letterSpacing: '-0.03em', color: '#111827', marginBottom: 16,
            }}>
              The simplest way to practice trading
            </h2>
            <p style={{ fontSize: 17, color: '#6B7280', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              Most practice tools are either too complex, too expensive, or too disconnected from real trading. FlowState isn't.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} style={{
                background: '#fff', borderRadius: 18, padding: '28px 28px',
                border: '1px solid #F3F4F6',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex', gap: 18, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: '#EEF2FF', color: '#2962FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 8, letterSpacing: '-0.02em' }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.65, margin: 0 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '112px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#F3F4F6', color: '#6B7280',
              borderRadius: 999, padding: '5px 16px',
              fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
              textTransform: 'uppercase', marginBottom: 20,
            }}>
              Pricing
            </div>
            <h2 style={{
              fontSize: 'clamp(30px, 4.5vw, 44px)',
              fontWeight: 800, letterSpacing: '-0.03em', color: '#111827', marginBottom: 16,
            }}>
              Simple, honest pricing
            </h2>
            <p style={{ fontSize: 17, color: '#6B7280', lineHeight: 1.6 }}>
              One product. Two billing options. No upsells, no feature gating, no tricks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <PricingCard
              title="Monthly"
              price="$5"
              period="/month"
              sub="Perfect for getting started"
              features={PLAN_FEATURES}
              href={monthlyPriceId ? `/checkout?priceId=${monthlyPriceId}` : '/signup'}
            />
            <PricingCard
              title="Annual"
              price="$48"
              period="/year"
              sub="Save 20% · $4/month, billed annually"
              badge="Save 20%"
              features={PLAN_FEATURES}
              href={annualPriceId ? `/checkout?priceId=${annualPriceId}` : '/signup'}
              accent
            />
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 28 }}>
            Both plans include a 7-day free trial. No charge until the trial ends.
          </p>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #1A40CC 0%, #2962FF 50%, #1A53FF 100%)',
        padding: '96px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 16,
          }}>
            Ready to sharpen your edge?
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.72)', marginBottom: 40, lineHeight: 1.6 }}>
            Join traders who practice smarter — and see the results in their real accounts.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{
              display: 'inline-block', background: '#fff', color: '#2962FF',
              fontWeight: 700, fontSize: 15, padding: '14px 36px', borderRadius: 12,
              textDecoration: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.20)',
              letterSpacing: '-0.01em',
            }}>
              Start free trial
            </Link>
            <Link to="/login" style={{
              display: 'inline-block', color: 'rgba(255,255,255,0.85)',
              fontWeight: 600, fontSize: 15, padding: '14px 36px', borderRadius: 12,
              textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.25)',
              letterSpacing: '-0.01em',
            }}>
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #F3F4F6', padding: '48px 40px 36px', background: '#fff' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
            {/* Brand */}
            <div style={{ maxWidth: 260 }}>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.03em', color: '#111827', marginBottom: 12 }}>
                FlowState<span style={{ color: '#2962FF' }}>Trading</span>
              </div>
              <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>
                Deliberate practice for serious futures traders. ES and NQ bar-by-bar replay with real market data.
              </p>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Product</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a href="#about" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>About</a>
                  <a href="#pricing" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Pricing</a>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Account</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Link to="/login"  style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Log in</Link>
                  <Link to="/signup" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Sign up</Link>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Social</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a href="#" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Twitter / X</a>
                  <a href="#" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>Discord</a>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#D1D5DB' }}>© 2026 FlowState Trading. All rights reserved.</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="#" style={{ fontSize: 12, color: '#D1D5DB', textDecoration: 'none' }}>Privacy</a>
              <a href="#" style={{ fontSize: 12, color: '#D1D5DB', textDecoration: 'none' }}>Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Pricing card ──────────────────────────────────────────────────────────────
function PricingCard({
  title, price, period, sub, badge, features, href, accent,
}: {
  title: string; price: string; period: string; sub?: string; badge?: string;
  features: string[]; href: string; accent?: boolean;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 20, padding: '32px 28px',
      border: accent ? '2px solid #2962FF' : '1.5px solid #E5E7EB',
      boxShadow: accent ? '0 8px 40px rgba(41,98,255,0.14)' : '0 2px 12px rgba(0,0,0,0.04)',
      position: 'relative', display: 'flex', flexDirection: 'column',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: 20, right: 20,
          background: '#EEF2FF', color: '#2962FF',
          fontSize: 10, fontWeight: 800, borderRadius: 999,
          padding: '4px 10px', letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {badge}
        </div>
      )}

      <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
        <span style={{ fontSize: 52, fontWeight: 800, color: '#111827', letterSpacing: '-0.04em', lineHeight: 1 }}>
          {price}
        </span>
        <span style={{ fontSize: 15, color: '#9CA3AF', fontWeight: 500 }}>{period}</span>
      </div>
      {sub && (
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 28 }}>{sub}</div>
      )}
      {!sub && <div style={{ height: 28 }} />}

      <ul style={{ listStyle: 'none', margin: '0 0 28px', padding: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
        {features.map(f => (
          <li key={f} style={{ fontSize: 14, color: '#374151', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: '#10B981', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <Link
        to={href}
        style={{
          display: 'block', textAlign: 'center', textDecoration: 'none',
          fontWeight: 700, fontSize: 14, padding: '13px',
          borderRadius: 12, marginTop: 'auto',
          ...(accent
            ? {
              background: 'linear-gradient(135deg, #2962FF 0%, #1A53FF 100%)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(41,98,255,0.30)',
            }
            : {
              border: '1.5px solid #E5E7EB',
              color: '#374151',
              background: '#fff',
            }),
        }}
      >
        Start 7-day free trial
      </Link>
    </div>
  );
}
