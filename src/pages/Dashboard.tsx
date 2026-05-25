import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AppNav } from '../components/Nav/AppNav';
import { Badge } from '../components/ui/Badge';
import { NewSessionModal } from '../components/NewSessionModal/NewSessionModal';
import { preloadData } from '../lib/replayData';
import type { TradeOutcome, SessionConfig } from '../types';

interface QuickStats {
  totalTrades: number;
  wins: number;
  currentStreak: number;
  totalPips: number;
}

interface RecentSession {
  id: string;
  startedAt: string;
  timeframe: string;
  tradeCount: number;
  wins: number;
  losses: number;
  totalPips: number;
}

const QUICK_LINKS = [
  {
    href: '/app/bias',
    icon: '📋',
    title: 'Bias & Strategy',
    desc: 'Edit your pre-trade checklist and trading rules',
    color: '#EEF2FF',
    border: '#C7D2FE',
  },
  {
    href: '/app/review',
    icon: '📂',
    title: 'Session Review',
    desc: 'Browse and analyse your past sessions',
    color: '#F0FDF4',
    border: '#BBF7D0',
  },
  {
    href: '/app/stats',
    icon: '📈',
    title: 'Statistics',
    desc: 'Win rate, streaks, and performance trends',
    color: '#FFF7ED',
    border: '#FED7AA',
  },
  {
    href: '/app/pro-trades',
    icon: '🏆',
    title: 'Pro Trades',
    desc: 'See how top traders are performing',
    color: '#FDF4FF',
    border: '#E9D5FF',
  },
] as const;

export function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    preloadData(); // start fetching chart data in background immediately
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchStats(), fetchRecentSessions()]).finally(() => setLoading(false));
  }, [user]);

  async function fetchStats() {
    if (!user) return;
    const { data } = await supabase
      .from('user_stats')
      .select('total_trades, wins, current_streak, total_pips')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setStats({
        totalTrades: data.total_trades ?? 0,
        wins: data.wins ?? 0,
        currentStreak: data.current_streak ?? 0,
        totalPips: data.total_pips ?? 0,
      });
    }
  }

  async function fetchRecentSessions() {
    if (!user) return;

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, started_at, timeframe')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5);

    if (!sessions || sessions.length === 0) return;

    const sessionIds = sessions.map(s => s.id);
    const { data: trades } = await supabase
      .from('trades')
      .select('session_id, outcome, pnl_pips')
      .in('session_id', sessionIds);

    const summaries: RecentSession[] = sessions.map(s => {
      const sessionTrades = trades?.filter(t => t.session_id === s.id) ?? [];
      return {
        id: s.id,
        startedAt: s.started_at ?? '',
        timeframe: s.timeframe ?? 'M1',
        tradeCount: sessionTrades.length,
        wins: sessionTrades.filter(t => t.outcome === 'win').length,
        losses: sessionTrades.filter(t => t.outcome === 'loss').length,
        totalPips: sessionTrades.reduce((sum, t) => sum + (t.pnl_pips ?? 0), 0),
      };
    });

    setRecentSessions(summaries);
  }

  function handleStartSession(config: SessionConfig) {
    setShowModal(false);
    navigate('/app/trade', { state: { sessionConfig: config } });
  }

  const winRate = stats && stats.totalTrades > 0
    ? Math.round((stats.wins / stats.totalTrades) * 100)
    : null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const displayName = profile?.username ?? user?.email?.split('@')[0] ?? 'trader';

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' }}>
      {showModal && (
        <NewSessionModal
          onStart={handleStartSession}
          onCancel={() => setShowModal(false)}
        />
      )}
      <AppNav />

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '36px 24px 60px' }}>

        {/* ── Welcome header ─────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', marginBottom: 4 }}>
              {greeting}, {displayName} 👋
            </h1>
            <p style={{ fontSize: 14, color: '#9CA3AF' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              borderRadius: 999,
              boxShadow: '0 4px 16px rgba(41,98,255,0.3)',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'opacity 0.12s',
            }}
          >
            Start new session →
          </button>
        </div>

        {/* ── Quick stats row ─────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          <StatCard
            label="Win Rate"
            value={loading ? '—' : winRate !== null ? `${winRate}%` : '—'}
            sub={stats ? `${stats.wins} of ${stats.totalTrades} trades` : 'No trades yet'}
            accent="#10B981"
          />
          <StatCard
            label="Total Trades"
            value={loading ? '—' : String(stats?.totalTrades ?? 0)}
            sub="All sessions combined"
            accent="#2962FF"
          />
          <StatCard
            label="Win Streak"
            value={loading ? '—' : String(stats?.currentStreak ?? 0)}
            sub="Current consecutive wins"
            accent="#F59E0B"
          />
          <StatCard
            label="Total Points"
            value={loading ? '—' : stats ? (stats.totalPips >= 0 ? '+' : '') + stats.totalPips.toFixed(1) : '—'}
            sub="Cumulative P&L"
            accent={stats && stats.totalPips >= 0 ? '#10B981' : '#EF4444'}
          />
        </div>

        {/* ── Main content grid ───────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* Left: Recent Activity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Recent Activity</h2>
              <Link to="/app/review" style={{ fontSize: 13, color: '#2962FF', textDecoration: 'none', fontWeight: 600 }}>
                View all →
              </Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ height: 64, background: '#fff', borderRadius: 14, border: '1px solid #F3F4F6' }} />
                ))}
              </div>
            ) : recentSessions.length === 0 ? (
              <div style={{
                background: '#fff', borderRadius: 16, padding: '48px 24px',
                textAlign: 'center', border: '1px solid #F3F4F6',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No sessions yet</div>
                <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>
                  Start your first trading session to see activity here.
                </div>
                <button onClick={() => setShowModal(true)} style={{
                  display: 'inline-block', padding: '10px 24px',
                  background: 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
                  color: '#fff', border: 'none', borderRadius: 999,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  Start trading
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentSessions.map(s => {
                  const sessionOutcome: TradeOutcome = s.wins > s.losses ? 'win' : s.losses > s.wins ? 'loss' : 'breakeven';
                  const wr = s.tradeCount > 0 ? Math.round((s.wins / s.tradeCount) * 100) : 0;
                  return (
                    <div
                      key={s.id}
                      style={{
                        background: '#fff',
                        borderRadius: 14,
                        padding: '14px 18px',
                        border: '1px solid #F3F4F6',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                      }}
                    >
                      {/* Date + TF */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                            {new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, color: '#2962FF',
                            background: '#EEF2FF', padding: '1px 7px', borderRadius: 999,
                          }}>
                            {s.timeframe}
                          </span>
                          <Badge
                            label={sessionOutcome === 'win' ? 'Win' : sessionOutcome === 'loss' ? 'Loss' : 'BE'}
                            variant={sessionOutcome}
                          />
                        </div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                          {s.tradeCount} trade{s.tradeCount !== 1 ? 's' : ''} · {wr}% WR
                        </div>
                      </div>

                      {/* P&L */}
                      <div style={{
                        fontSize: 15, fontWeight: 700,
                        color: s.totalPips >= 0 ? '#10B981' : '#EF4444',
                        textAlign: 'right',
                      }}>
                        {s.totalPips >= 0 ? '+' : ''}{s.totalPips.toFixed(2)}
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>pts</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Quick Access */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Quick Access</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {QUICK_LINKS.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 16px',
                    background: link.color,
                    borderRadius: 14,
                    border: `1px solid ${link.border}`,
                    textDecoration: 'none',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{link.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
                      {link.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>
                      {link.desc}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      padding: '16px 18px',
      border: '1px solid #F3F4F6',
      boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{sub}</div>
    </div>
  );
}
