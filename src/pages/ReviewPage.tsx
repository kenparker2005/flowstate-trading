import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AppNav } from '../components/Nav/AppNav';
import { Badge } from '../components/ui/Badge';
import type { TradeOutcome } from '../types';

interface SessionSummary {
  id: string;
  startedAt: string;
  timeframe: string;
  pairSymbol: string;
  tradeCount: number;
  wins: number;
  losses: number;
  totalPips: number;
  biasTotal: number;
  biasFullCount: number;
}

export function ReviewPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSessions();
  }, [user]);

  async function fetchSessions() {
    if (!user) return;

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(30);

    if (!sessionData) {
      setLoading(false);
      return;
    }

    const summaries: SessionSummary[] = await Promise.all(
      sessionData.map(async s => {
        const { data: trades } = await supabase
          .from('trades')
          .select('outcome, pnl_pips, bias_checked')
          .eq('session_id', s.id);

        const wins = trades?.filter(t => t.outcome === 'win').length ?? 0;
        const losses = trades?.filter(t => t.outcome === 'loss').length ?? 0;
        const totalPips = trades?.reduce((sum, t) => sum + (t.pnl_pips ?? 0), 0) ?? 0;

        // Count trades where every bias item was checked
        const tradesWithBias = trades?.filter(t => t.bias_checked !== null) ?? [];
        const fullChecklistTrades = tradesWithBias.filter(t => {
          const vals = Object.values(t.bias_checked as Record<string, boolean>);
          return vals.length > 0 && vals.every(v => v);
        });

        return {
          id: s.id,
          startedAt: s.started_at ?? '',
          timeframe: s.timeframe ?? 'M1',
          pairSymbol: 'ES/NQ',
          tradeCount: trades?.length ?? 0,
          wins,
          losses,
          totalPips,
          biasTotal: tradesWithBias.length,
          biasFullCount: fullChecklistTrades.length,
        };
      })
    );

    setSessions(summaries);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' }}>
      <AppNav />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', marginBottom: 4 }}>
              Session review
            </h1>
            <p style={{ fontSize: 14, color: '#6B7280' }}>Your recent trading sessions.</p>
          </div>
          <Link
            to="/app/simulator"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              borderRadius: 999,
            }}
          >
            New session
          </Link>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 76, background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6' }} />
            ))}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: '64px 24px',
            textAlign: 'center',
            border: '1px solid #F3F4F6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>No sessions yet</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
              Complete your first trading session to see a review here.
            </div>
            <Link
              to="/app/simulator"
              style={{
                display: 'inline-block',
                padding: '11px 28px',
                background: 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Start your first session
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.map(s => {
            const winRate = s.tradeCount > 0 ? ((s.wins / s.tradeCount) * 100).toFixed(0) : '0';
            const mainOutcome: TradeOutcome = s.wins > s.losses ? 'win' : s.losses > s.wins ? 'loss' : 'breakeven';

            return (
              <div
                key={s.id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '16px 20px',
                  border: '1px solid #F3F4F6',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
              >
                {/* Left: pair + date */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{s.pairSymbol}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#2962FF',
                      background: '#EEF2FF',
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}>
                      {s.timeframe}
                    </span>
                    <Badge label={mainOutcome === 'win' ? 'Win' : mainOutcome === 'loss' ? 'Loss' : 'BE'} variant={mainOutcome} />
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {new Date(s.startedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </div>
                </div>

                {/* Center: trade count + WR */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{winRate}% WR</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.tradeCount} trade{s.tradeCount !== 1 ? 's' : ''}</div>
                </div>

                {/* Bias compliance badge */}
                {s.biasTotal > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: s.biasFullCount === s.biasTotal ? '#F0FDF4' : '#FFFBEB',
                      border: `1px solid ${s.biasFullCount === s.biasTotal ? '#BBF7D0' : '#FDE68A'}`,
                    }}>
                      <span style={{ fontSize: 10 }}>{s.biasFullCount === s.biasTotal ? '✓' : '△'}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: s.biasFullCount === s.biasTotal ? '#15803D' : '#92400E',
                      }}>
                        {s.biasFullCount}/{s.biasTotal}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>checklist</div>
                  </div>
                )}

                {/* Right: pips */}
                <div style={{
                  minWidth: 72,
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: 15,
                  color: s.totalPips >= 0 ? '#10B981' : '#EF4444',
                }}>
                  {s.totalPips >= 0 ? '+' : ''}{s.totalPips.toFixed(2)}
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>pts</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
