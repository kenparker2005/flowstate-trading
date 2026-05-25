import type { UserStats } from '../../types';

interface StatsOverviewProps {
  stats: UserStats | null;
  loading: boolean;
}

export function StatsOverview({ stats, loading }: StatsOverviewProps) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: '#F3F4F6', borderRadius: 16, padding: '20px', height: 96, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '48px 0',
        color: '#9CA3AF',
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
      }}>
        No stats yet. Complete a trade to get started.
      </div>
    );
  }

  const winRate = stats.totalTrades > 0 ? ((stats.wins / stats.totalTrades) * 100).toFixed(1) : '0.0';
  const pipsPositive = stats.totalPips >= 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, fontFamily: 'Inter, sans-serif' }}>
      <StatCard
        label="Win rate"
        value={`${winRate}%`}
        sub={`${stats.wins}W / ${stats.losses}L`}
        accent="#2962FF"
      />
      <StatCard
        label="Total trades"
        value={String(stats.totalTrades)}
        sub={`${stats.totalSessions} sessions`}
        accent="#6366F1"
      />
      <StatCard
        label="Total pts"
        value={`${pipsPositive ? '+' : ''}${stats.totalPips.toFixed(2)}`}
        sub="cumulative"
        accent={pipsPositive ? '#10B981' : '#EF4444'}
        valueColor={pipsPositive ? '#10B981' : '#EF4444'}
      />
      <StatCard
        label="Best streak"
        value={String(stats.bestStreak)}
        sub={`Current: ${stats.currentStreak}`}
        accent="#F59E0B"
      />
    </div>
  );
}

function StatCard({
  label, value, sub, accent, valueColor,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  valueColor?: string;
}) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 16,
      padding: '20px',
      border: '1px solid #F3F4F6',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      borderTop: `3px solid ${accent}`,
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: valueColor ?? '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{sub}</div>
    </div>
  );
}
