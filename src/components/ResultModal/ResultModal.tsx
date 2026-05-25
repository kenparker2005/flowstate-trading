import type { TradeResult } from '../../types';
import { formatPrice } from '../../lib/candleUtils';

interface ResultModalProps {
  result: TradeResult;
  onContinue: () => void;
  onEndSession: () => void;
}

export function ResultModal({ result, onContinue, onEndSession }: ResultModalProps) {
  const isWin = result.outcome === 'win';
  const isLoss = result.outcome === 'loss';

  const config = isWin
    ? { label: 'Trade Won', emoji: '🎯', bg: '#F0FDF4', border: '#86EFAC', labelColor: '#16A34A', badgeBg: '#DCFCE7', badgeColor: '#15803D' }
    : isLoss
      ? { label: 'Trade Lost', emoji: '📉', bg: '#FEF2F2', border: '#FCA5A5', labelColor: '#DC2626', badgeBg: '#FEE2E2', badgeColor: '#B91C1C' }
      : { label: 'Breakeven', emoji: '🤝', bg: '#F8F9FA', border: '#D1D5DB', labelColor: '#374151', badgeBg: '#F3F4F6', badgeColor: '#4B5563' };

  const pipsSign = result.pnlPips >= 0 ? '+' : '';
  const rrSign = result.rrAchieved >= 0 ? '+' : '';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 24,
        width: '100%',
        maxWidth: 360,
        margin: '0 16px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.16)',
        overflow: 'hidden',
      }}>

        {/* ── Outcome banner ──────────────────────────── */}
        <div style={{
          background: config.bg,
          borderBottom: `1px solid ${config.border}`,
          padding: '24px 24px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{config.emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: config.labelColor, letterSpacing: '-0.02em', marginBottom: 8 }}>
            {config.label}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
            <span style={{
              background: config.badgeBg,
              color: config.badgeColor,
              fontWeight: 700,
              fontSize: 14,
              padding: '4px 14px',
              borderRadius: 999,
            }}>
              {pipsSign}{result.pnlPips.toFixed(2)} pts
            </span>
            <span style={{
              background: '#EEF2FF',
              color: '#2962FF',
              fontWeight: 700,
              fontSize: 14,
              padding: '4px 14px',
              borderRadius: 999,
            }}>
              {rrSign}{result.rrAchieved.toFixed(2)}R
            </span>
          </div>
        </div>

        {/* ── Trade stats ─────────────────────────────── */}
        <div style={{ padding: '18px 24px' }}>
          <StatRow label="Direction" value={result.direction === 'long' ? '▲ Long' : '▼ Short'}
            valueColor={result.direction === 'long' ? '#10B981' : '#EF4444'} />
          <StatRow label="Entry price" value={formatPrice(result.entryPrice)} />
          <StatRow label="Exit price" value={formatPrice(result.exitPrice)} />
          <div style={{ height: 1, background: '#F3F4F6', margin: '10px 0' }} />
          <StatRow label="Stop loss" value={formatPrice(result.stopLoss)} valueColor="#EF4444" />
          <StatRow label="Take profit" value={formatPrice(result.takeProfit)} valueColor="#10B981" />
        </div>

        {/* ── Actions ─────────────────────────────────── */}
        <div style={{
          padding: '0 24px 24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}>
          <button
            onClick={onEndSession}
            style={{
              padding: '11px',
              background: '#F3F4F6',
              border: 'none',
              color: '#374151',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'; }}
          >
            End session
          </button>
          <button
            onClick={onContinue}
            style={{
              padding: '11px',
              background: 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
              border: 'none',
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '5px 0',
    }}>
      <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: valueColor ?? '#111827', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
