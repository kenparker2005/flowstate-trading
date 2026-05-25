import { Link } from 'react-router-dom';

export function Landing() {
  const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID as string;
  const annualPriceId = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID as string;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111827', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Nav ───────────────────────────────────────── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #F3F4F6',
        padding: '0 32px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em', color: '#111827' }}>
          FlowState<span style={{ color: '#2962FF' }}>Trading</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/login" style={{
            fontWeight: 500,
            fontSize: 14,
            color: '#6B7280',
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            transition: 'color 0.15s',
          }}>
            Log in
          </Link>
          <Link to="/signup" className="mkt-btn-primary">
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '100px 32px 80px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: '#EEF2FF',
          color: '#2962FF',
          borderRadius: 999,
          padding: '6px 16px',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 28,
          letterSpacing: '0.01em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2962FF', display: 'inline-block' }} />
          Forex Replay Simulator
        </div>

        <h1 style={{
          fontSize: 'clamp(40px, 6vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.04em',
          color: '#111827',
          marginBottom: 24,
        }}>
          Practice like a pro.<br />
          <span style={{ color: '#2962FF' }}>Trade like one.</span>
        </h1>

        <p style={{
          fontSize: 18,
          color: '#6B7280',
          lineHeight: 1.7,
          maxWidth: 520,
          margin: '0 auto 40px',
          fontWeight: 400,
        }}>
          Replay real historical forex data bar-by-bar. Build discipline, test your edge, and track your performance — without risking a cent.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/signup" className="mkt-btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
            Start free trial
          </Link>
          <a href="#how-it-works" className="mkt-btn-ghost" style={{ fontSize: 16, padding: '14px 32px' }}>
            See how it works
          </a>
        </div>

        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 20 }}>
          No credit card required · Cancel anytime
        </p>
      </section>

      {/* ── Chart preview ─────────────────────────────── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px 100px' }}>
        <div style={{
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(41,98,255,0.12), 0 8px 32px rgba(0,0,0,0.08)',
          border: '1px solid #E5E7EB',
          background: '#0D0D0F',
          aspectRatio: '16/9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              color: '#434651',
              letterSpacing: '0.05em',
            }}>
              EURUSD · M1 · Bar-by-Bar Replay
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: '#2E3140',
              marginTop: 8,
            }}>
              [ simulator preview ]
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────── */}
      <section id="how-it-works" style={{
        background: '#F8F9FA',
        padding: '100px 32px',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#111827',
              marginBottom: 16,
            }}>
              How it works
            </h2>
            <p style={{ fontSize: 17, color: '#6B7280', maxWidth: 480, margin: '0 auto' }}>
              Three simple steps to build your trading edge.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
          }}>
            <StepCard
              n={1}
              icon="📈"
              title="Pick a pair & timeframe"
              desc="Select EURUSD, GBPUSD, or USDJPY across five timeframes. The date is hidden — trade pure price action."
            />
            <StepCard
              n={2}
              icon="🎯"
              title="Execute your trade"
              desc="Advance bars one at a time. Set your stop loss and take profit, then let the market decide."
            />
            <StepCard
              n={3}
              icon="📊"
              title="Track your progress"
              desc="Win rate, average RR, pip totals, and streak data. Review every trade and improve systematically."
            />
          </div>
        </div>
      </section>

      {/* ── Pricing preview ───────────────────────────── */}
      <section id="pricing" style={{ padding: '100px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#111827',
              marginBottom: 16,
            }}>
              Simple, honest pricing
            </h2>
            <p style={{ fontSize: 17, color: '#6B7280' }}>
              One product. One price. No tricks.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            <PricingCard
              title="Monthly"
              price="$5"
              period="/month"
              features={['Unlimited replay sessions', 'All forex pairs', 'Full stats dashboard', 'Trade review']}
              priceId={monthlyPriceId}
            />
            <PricingCard
              title="Annual"
              price="$48"
              period="/year"
              sub="$4 / month, billed annually"
              badge="Save 20%"
              features={['Everything in Monthly', '2 months free', 'Priority support']}
              priceId={annualPriceId}
              accent
            />
          </div>
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
        padding: '80px 32px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 36,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.03em',
          marginBottom: 16,
        }}>
          Ready to sharpen your edge?
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', marginBottom: 36 }}>
          Join traders who practise smarter, not harder.
        </p>
        <Link to="/signup" style={{
          display: 'inline-block',
          background: '#fff',
          color: '#2962FF',
          fontWeight: 700,
          fontSize: 15,
          padding: '14px 36px',
          borderRadius: 999,
          textDecoration: 'none',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          transition: 'transform 0.15s',
        }}>
          Start free trial
        </Link>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid #F3F4F6',
        padding: '40px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 960,
        margin: '0 auto',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: '#111827' }}>
          FlowState<span style={{ color: '#2962FF' }}>Trading</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/pricing" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>Pricing</Link>
          <Link to="/login" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>Log in</Link>
          <Link to="/signup" style={{ fontSize: 13, color: '#9CA3AF', textDecoration: 'none' }}>Sign up</Link>
        </div>
        <div style={{ fontSize: 12, color: '#D1D5DB' }}>© 2026 FlowState Trading</div>
      </footer>
    </div>
  );
}

function StepCard({ n, icon, title, desc }: { n: number; icon: string; title: string; desc: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      padding: '32px 28px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      border: '1px solid #F3F4F6',
    }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#2962FF',
        letterSpacing: '0.08em',
        marginBottom: 10,
        textTransform: 'uppercase',
      }}>
        Step {n}
      </div>
      <h3 style={{ fontWeight: 700, fontSize: 18, color: '#111827', marginBottom: 10, letterSpacing: '-0.02em' }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

function PricingCard({
  title, price, period, sub, features, priceId, accent, badge,
}: {
  title: string;
  price: string;
  period: string;
  sub?: string;
  features: string[];
  priceId: string;
  accent?: boolean;
  badge?: string;
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      padding: '32px 28px',
      boxShadow: accent
        ? '0 8px 40px rgba(41,98,255,0.15)'
        : '0 2px 16px rgba(0,0,0,0.06)',
      border: accent ? '2px solid #2962FF' : '1px solid #F3F4F6',
      position: 'relative',
    }}>
      {badge && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: '#EEF2FF',
          color: '#2962FF',
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 999,
          padding: '4px 10px',
          letterSpacing: '0.04em',
        }}>
          {badge}
        </div>
      )}
      <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 48, fontWeight: 800, color: '#111827', letterSpacing: '-0.04em', lineHeight: 1 }}>
          {price}
        </span>
        <span style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 500 }}>{period}</span>
      </div>
      {sub && <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 24 }}>{sub}</div>}
      {!sub && <div style={{ marginBottom: 24 }} />}
      <ul style={{ listStyle: 'none', marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {features.map(f => (
          <li key={f} style={{ fontSize: 14, color: '#374151', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        to={priceId ? `/checkout?priceId=${priceId}` : '/signup'}
        className={accent ? 'mkt-btn-primary' : 'mkt-btn-ghost'}
        style={{ display: 'block', textAlign: 'center', fontSize: 14 }}
      >
        Get started
      </Link>
    </div>
  );
}
