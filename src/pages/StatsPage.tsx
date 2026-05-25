import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AppNav } from '../components/Nav/AppNav';
import { StatsOverview } from '../components/Stats/StatsOverview';
import { CalendarHeatmap } from '../components/Stats/CalendarHeatmap';
import type { DayStat } from '../components/Stats/CalendarHeatmap';
import { Badge } from '../components/ui/Badge';
import type { UserStats, ClosedTrade } from '../types';

interface BiasStats {
  full: { count: number; wins: number };
  partial: { count: number; wins: number };
}

export function StatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentTrades, setRecentTrades] = useState<ClosedTrade[]>([]);
  const [calendarData, setCalendarData] = useState<Record<string, DayStat>>({});
  const [biasStats, setBiasStats] = useState<BiasStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchStats();
    fetchRecentTrades();
    fetchCalendarData();
    fetchBiasStats();
  }, [user]);

  async function fetchStats() {
    if (!user) return;
    const { data } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setStats({
        userId: data.user_id,
        totalSessions: data.total_sessions ?? 0,
        totalTrades: data.total_trades ?? 0,
        wins: data.wins ?? 0,
        losses: data.losses ?? 0,
        breakevens: data.breakevens ?? 0,
        totalPips: data.total_pips ?? 0,
        bestStreak: data.best_streak ?? 0,
        currentStreak: data.current_streak ?? 0,
        updatedAt: data.updated_at ?? new Date().toISOString(),
      });
    }
    setLoading(false);
  }

  async function fetchRecentTrades() {
    if (!user) return;
    const { data } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setRecentTrades(data.map(t => ({
        id: t.id,
        sessionId: t.session_id ?? '',
        userId: t.user_id ?? '',
        direction: (t.direction as 'long' | 'short') ?? 'long',
        entryPrice: t.entry_price ?? 0,
        exitPrice: t.exit_price ?? 0,
        stopLoss: t.stop_loss ?? 0,
        takeProfit: t.take_profit ?? 0,
        entryBar: t.entry_bar ?? 0,
        exitBar: t.exit_bar ?? 0,
        outcome: (t.outcome as 'win' | 'loss' | 'breakeven') ?? 'loss',
        pnlPips: t.pnl_pips ?? 0,
        rrAchieved: t.rr_achieved ?? 0,
        biasChecked: t.bias_checked as Record<string, boolean> | null,
        createdAt: t.created_at ?? '',
      })));
    }
  }

  async function fetchBiasStats() {
    if (!user) return;
    // Fetch all trades that have bias data (null rows have no checklist context)
    const { data } = await supabase
      .from('trades')
      .select('outcome, bias_checked')
      .eq('user_id', user.id)
      .not('bias_checked', 'is', null);

    if (!data || data.length === 0) return;

    let fullCount = 0, fullWins = 0, partialCount = 0, partialWins = 0;
    for (const t of data) {
      const checked = t.bias_checked as Record<string, boolean> | null;
      if (!checked) continue;
      const values = Object.values(checked);
      const allChecked = values.length > 0 && values.every(v => v);
      if (allChecked) {
        fullCount++;
        if (t.outcome === 'win') fullWins++;
      } else {
        partialCount++;
        if (t.outcome === 'win') partialWins++;
      }
    }

    if (fullCount + partialCount > 0) {
      setBiasStats({ full: { count: fullCount, wins: fullWins }, partial: { count: partialCount, wins: partialWins } });
    }
  }

  async function fetchCalendarData() {
    if (!user) return;

    // Look back 4 full months from today
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 4);
    cutoff.setDate(1);

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, started_at')
      .eq('user_id', user.id)
      .gte('started_at', cutoff.toISOString())
      .order('started_at', { ascending: true });

    if (!sessions || sessions.length === 0) return;

    const sessionIds = sessions.map(s => s.id);

    const { data: trades } = await supabase
      .from('trades')
      .select('session_id, outcome, pnl_pips')
      .in('session_id', sessionIds);

    // Build a map of session_id → local date string (YYYY-MM-DD)
    const sessionDate: Record<string, string> = {};
    for (const s of sessions) {
      if (s.started_at) {
        // Convert UTC timestamp to local date string
        const local = new Date(s.started_at);
        const dateStr = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
        sessionDate[s.id] = dateStr;
      }
    }

    // Aggregate per calendar day
    const byDate: Record<string, DayStat> = {};

    for (const s of sessions) {
      const date = sessionDate[s.id];
      if (!date) continue;
      if (!byDate[date]) byDate[date] = { sessionCount: 0, tradeCount: 0, wins: 0, totalPts: 0 };
      byDate[date].sessionCount++;
    }

    for (const t of trades ?? []) {
      const date = sessionDate[t.session_id ?? ''];
      if (!date || !byDate[date]) continue;
      byDate[date].tradeCount++;
      if (t.outcome === 'win') byDate[date].wins++;
      byDate[date].totalPts += t.pnl_pips ?? 0;
    }

    setCalendarData(byDate);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' }}>
      <AppNav />

      <div style={{ maxWidth: 940, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', marginBottom: 4 }}>
          Performance
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>
          Your trading statistics across all sessions.
        </p>

        {/* ── Performance cards ───────────────────────── */}
        <StatsOverview stats={stats} loading={loading} />

        {/* ── Trading Activity calendar ────────────────── */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
              Trading Activity
            </h2>
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>Last 4 months</span>
          </div>
          <CalendarHeatmap data={calendarData} />
        </div>

        {/* ── Win rate breakdown ───────────────────────── */}
        {stats && stats.totalTrades > 0 && (
          <div style={{
            marginTop: 24,
            background: '#fff',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #F3F4F6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Win rate breakdown</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>
                {((stats.wins / stats.totalTrades) * 100).toFixed(1)}%
              </span>
            </div>
            {/* Segmented bar */}
            <div style={{ height: 10, borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
              <div style={{
                width: `${(stats.wins / stats.totalTrades) * 100}%`,
                background: '#10B981',
                transition: 'width 0.6s ease',
              }} />
              <div style={{
                width: `${(stats.breakevens / stats.totalTrades) * 100}%`,
                background: '#E5E7EB',
              }} />
              <div style={{
                width: `${(stats.losses / stats.totalTrades) * 100}%`,
                background: '#FCA5A5',
              }} />
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
              <LegendDot color="#10B981" label={`${stats.wins} wins`} />
              <LegendDot color="#E5E7EB" label={`${stats.breakevens} breakeven`} />
              <LegendDot color="#FCA5A5" label={`${stats.losses} losses`} />
            </div>
          </div>
        )}

        {/* ── Bias compliance ──────────────────────────── */}
        {biasStats && (biasStats.full.count + biasStats.partial.count) >= 3 && (
          <div style={{
            marginTop: 24,
            background: '#fff',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #F3F4F6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
                Checklist compliance
              </h2>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                Win rate when you follow your full pre-trade checklist vs. when you don't.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ComplianceCard
                label="Full checklist"
                count={biasStats.full.count}
                wins={biasStats.full.wins}
                color="#10B981"
                bgColor="#F0FDF4"
                borderColor="#BBF7D0"
              />
              <ComplianceCard
                label="Incomplete"
                count={biasStats.partial.count}
                wins={biasStats.partial.wins}
                color="#F59E0B"
                bgColor="#FFFBEB"
                borderColor="#FDE68A"
              />
            </div>
            {biasStats.full.count > 0 && biasStats.partial.count > 0 && (() => {
              const fullWR = (biasStats.full.wins / biasStats.full.count) * 100;
              const partialWR = (biasStats.partial.wins / biasStats.partial.count) * 100;
              const diff = fullWR - partialWR;
              return (
                <div style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  background: diff >= 0 ? '#F0FDF4' : '#FEF2F2',
                  borderRadius: 10,
                  fontSize: 12,
                  color: diff >= 0 ? '#065F46' : '#991B1B',
                  fontWeight: 600,
                }}>
                  {diff >= 0
                    ? `Following your full checklist gives you a +${diff.toFixed(1)}% higher win rate.`
                    : `Your win rate is ${Math.abs(diff).toFixed(1)}% lower with a full checklist — are you being too selective?`
                  }
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Recent trades ────────────────────────────── */}
        <div style={{ marginTop: 24, marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Recent trades</h2>

          {recentTrades.length === 0 ? (
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: '48px 24px',
              textAlign: 'center',
              border: '1px solid #F3F4F6',
              color: '#9CA3AF',
              fontSize: 14,
            }}>
              No trades yet. Head to the simulator to get started.
            </div>
          ) : (
            <div style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #F3F4F6',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {['Date', 'Direction', 'Entry', 'Exit', 'Pts', 'RR', 'Result'].map((h, i) => (
                      <th key={h} style={{
                        padding: '12px 16px',
                        textAlign: i >= 2 ? 'right' : 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((t, idx) => (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: idx < recentTrades.length - 1 ? '1px solid #F9FAFB' : 'none',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F9FAFB'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '11px 16px', color: '#6B7280', fontSize: 12 }}>
                        {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontWeight: 700, color: t.direction === 'long' ? '#10B981' : '#EF4444' }}>
                          {t.direction === 'long' ? '▲ Long' : '▼ Short'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', color: '#374151', fontWeight: 500 }}>
                        {t.entryPrice.toFixed(2)}
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', color: '#374151', fontWeight: 500 }}>
                        {t.exitPrice.toFixed(2)}
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: t.pnlPips >= 0 ? '#10B981' : '#EF4444' }}>
                        {t.pnlPips >= 0 ? '+' : ''}{t.pnlPips.toFixed(2)}
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', color: '#6B7280', fontWeight: 500 }}>
                        {t.rrAchieved.toFixed(2)}R
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        <Badge label={t.outcome === 'win' ? 'Win' : t.outcome === 'loss' ? 'Loss' : 'BE'} variant={t.outcome} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComplianceCard({ label, count, wins, color, bgColor, borderColor }: {
  label: string; count: number; wins: number;
  color: string; bgColor: string; borderColor: string;
}) {
  const winRate = count > 0 ? (wins / count) * 100 : null;
  return (
    <div style={{
      padding: '14px 16px',
      background: bgColor,
      borderRadius: 12,
      border: `1px solid ${borderColor}`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>{label}</div>
      {count === 0 ? (
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>No data yet</div>
      ) : (
        <>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {winRate !== null ? `${winRate.toFixed(0)}%` : '—'}
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
            win rate · {count} trade{count !== 1 ? 's' : ''}
          </div>
          {/* Mini bar */}
          <div style={{ height: 4, background: '#E5E7EB', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${winRate ?? 0}%`,
              background: color,
              borderRadius: 999,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
    </div>
  );
}
