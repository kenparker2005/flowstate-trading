import { AppNav } from '../components/Nav/AppNav';

const MOCK_TRADES = [
  { trader: 'apex_fx', pair: 'ES', direction: 'long',  outcome: 'win',  rr: 3.2, pts: '+12.50', time: '2h ago',  avatar: 'A' },
  { trader: 'vault_trader', pair: 'NQ', direction: 'short', outcome: 'win',  rr: 2.8, pts: '+24.75', time: '4h ago',  avatar: 'V' },
  { trader: 'priceaction_j', pair: 'ES', direction: 'long',  outcome: 'win',  rr: 2.0, pts: '+8.00',  time: '5h ago',  avatar: 'P' },
  { trader: 'liquidityking', pair: 'NQ', direction: 'short', outcome: 'loss', rr: -1.0, pts: '-8.25', time: '7h ago',  avatar: 'L' },
  { trader: 'session_pro',   pair: 'ES', direction: 'long',  outcome: 'win',  rr: 4.1, pts: '+18.00', time: '9h ago',  avatar: 'S' },
];

export function ProTradesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' }}>
      <AppNav />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em' }}>
              Pro Trades
            </h1>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#7C3AED',
              background: '#F5F3FF', border: '1px solid #DDD6FE',
              padding: '3px 10px', borderRadius: 999, letterSpacing: '0.04em',
            }}>
              COMING SOON
            </span>
          </div>
          <p style={{ fontSize: 14, color: '#6B7280' }}>
            See how top traders are performing. Filter by pair, session, and date.
          </p>
        </div>

        {/* Coming soon banner */}
        <div style={{
          background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
          border: '1px solid #DDD6FE',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>🏆</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#4338CA', marginBottom: 4 }}>
              Launching with V2
            </div>
            <div style={{ fontSize: 13, color: '#6366F1', lineHeight: 1.5 }}>
              Pro Trades will show a live feed of verified profitable traders — their entries, exits, bias checklist, and R:R. Learn from the best while you replay.
            </div>
          </div>
        </div>

        {/* Mock feed (preview) */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Preview</h2>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Sample data only</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_TRADES.map((t, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: '14px 18px',
                  border: '1px solid #F3F4F6',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  opacity: 0.65,
                  filter: 'blur(0.3px)',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2962FF, #6366F1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0,
                }}>
                  {t.avatar}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>@{t.trader}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: '#2962FF',
                      background: '#EEF2FF', padding: '1px 7px', borderRadius: 999,
                    }}>
                      {t.pair}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: t.direction === 'long' ? '#10B981' : '#EF4444',
                    }}>
                      {t.direction === 'long' ? '▲ Long' : '▼ Short'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{t.time}</div>
                </div>

                {/* RR */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700,
                    color: t.outcome === 'win' ? '#10B981' : '#EF4444',
                  }}>
                    {t.pts} pts
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {t.rr > 0 ? `${t.rr}R` : `${t.rr}R`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lock overlay hint */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Live feed locked
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF' }}>
            Real trades will unlock when Pro Trades launches.
          </div>
        </div>
      </div>
    </div>
  );
}
