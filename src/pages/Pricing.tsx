import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createCheckoutSession } from '../lib/stripe';

export function Pricing() {
  const { user } = useAuth();
  const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID as string;
  const annualPriceId = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID as string;

  async function handleCheckout(priceId: string) {
    if (!user) {
      window.location.href = '/signup';
      return;
    }
    await createCheckoutSession(priceId, user.id);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif', color: '#111827' }}>

      {/* ── Nav ─────────────────────────────────────── */}
      <nav style={{
        background: '#fff',
        borderBottom: '1px solid #F3F4F6',
        padding: '0 32px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ fontWeight: 800, fontSize: 18, color: '#111827', textDecoration: 'none', letterSpacing: '-0.03em' }}>
          FlowState<span style={{ color: '#2962FF' }}>Trading</span>
        </Link>
        <div>
          {user ? (
            <Link to="/app/simulator" className="mkt-btn-primary" style={{ fontSize: 13 }}>
              Go to app
            </Link>
          ) : (
            <Link to="/login" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}>
              Log in
            </Link>
          )}
        </div>
      </nav>

      {/* ── Header ──────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '80px 32px 60px' }}>
        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: '#111827',
          marginBottom: 16,
        }}>
          Simple, honest pricing
        </h1>
        <p style={{ fontSize: 18, color: '#6B7280', maxWidth: 400, margin: '0 auto' }}>
          One product. One price. No tricks.
        </p>
      </div>

      {/* ── Cards ───────────────────────────────────── */}
      <div style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '0 32px 80px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 20,
      }}>

        {/* Monthly */}
        <div style={{
          background: '#fff',
          borderRadius: 24,
          padding: '36px 32px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 12 }}>Monthly</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 28 }}>
            <span style={{ fontSize: 52, fontWeight: 800, color: '#111827', letterSpacing: '-0.04em', lineHeight: 1 }}>$5</span>
            <span style={{ fontSize: 14, color: '#9CA3AF' }}>/month</span>
          </div>
          <ul style={{ listStyle: 'none', marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Unlimited replay sessions', 'All forex pairs', 'Full stats dashboard', 'Trade history & review'].map(f => (
              <li key={f} style={{ fontSize: 14, color: '#374151', display: 'flex', gap: 10 }}>
                <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
              </li>
            ))}
          </ul>
          <button
            className="mkt-btn-ghost"
            style={{ width: '100%', textAlign: 'center', fontSize: 14, cursor: 'pointer' }}
            onClick={() => handleCheckout(monthlyPriceId)}
          >
            Get started
          </button>
        </div>

        {/* Annual */}
        <div style={{
          background: '#fff',
          borderRadius: 24,
          padding: '36px 32px',
          border: '2px solid #2962FF',
          boxShadow: '0 8px 48px rgba(41,98,255,0.14)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: '#EEF2FF',
            color: '#2962FF',
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 999,
            padding: '4px 12px',
          }}>
            Save 20%
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 12 }}>Annual</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 52, fontWeight: 800, color: '#111827', letterSpacing: '-0.04em', lineHeight: 1 }}>$48</span>
            <span style={{ fontSize: 14, color: '#9CA3AF' }}>/year</span>
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 28 }}>$4/month billed annually</div>
          <ul style={{ listStyle: 'none', marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Everything in Monthly', '2 months free', 'Priority support'].map(f => (
              <li key={f} style={{ fontSize: 14, color: '#374151', display: 'flex', gap: 10 }}>
                <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
              </li>
            ))}
          </ul>
          <button
            className="mkt-btn-primary"
            style={{ width: '100%', textAlign: 'center', fontSize: 14, cursor: 'pointer' }}
            onClick={() => handleCheckout(annualPriceId)}
          >
            Get started
          </button>
        </div>
      </div>

      {/* ── Trust ───────────────────────────────────── */}
      <div style={{ textAlign: 'center', paddingBottom: 80, color: '#9CA3AF', fontSize: 13 }}>
        <p>Secure payment via Stripe · Cancel anytime · No hidden fees</p>
      </div>
    </div>
  );
}
