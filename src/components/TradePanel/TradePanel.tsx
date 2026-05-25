import { useState } from 'react';
import type { TradeDirection, ActiveTrade } from '../../types';
import { formatPrice } from '../../lib/candleUtils';

const BIAS_LABELS: Record<string, string> = {
  'daily_trend':          'Daily trend',
  '4h_trend':             '4H trend',
  '4h_candle_structure':  '4H candle structure',
  'liquidity_sweeps':     'Liquidity sweeps',
  'optimal_trade_timing': 'Optimal trade timing',
  'key_confluences':      'Key confluences',
};

function formatBiasLabel(key: string): string {
  return BIAS_LABELS[key] ?? key;
}

interface TradePanelProps {
  currentPrice: number | null;
  activeTrade: ActiveTrade | null;
  biasItems: string[];
  onEnterTrade: (
    direction: TradeDirection,
    entry: number,
    sl: number,
    tp: number,
    biasChecked: Record<string, boolean>
  ) => void;
  onCloseTrade: () => void;
  error: string | null;
  isSubscribed: boolean;
}

export function TradePanel({
  currentPrice,
  activeTrade,
  biasItems,
  onEnterTrade,
  onCloseTrade,
  error,
  isSubscribed,
}: TradePanelProps) {
  const [direction, setDirection] = useState<TradeDirection>('long');
  const [slInput, setSlInput] = useState('');
  const [tpInput, setTpInput] = useState('');
  const [inputMode, setInputMode] = useState<'price' | 'points'>('price');
  // biasChecked is a sparse map — missing keys default to false
  const [biasChecked, setBiasChecked] = useState<Record<string, boolean>>({});

  function toggleBias(key: string) {
    setBiasChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleEnter() {
    if (!currentPrice || !isSubscribed) return;
    const sl = parseFloat(slInput);
    const tp = parseFloat(tpInput);
    if (isNaN(sl) || isNaN(tp)) return;

    let slPrice = sl;
    let tpPrice = tp;
    if (inputMode === 'points') {
      slPrice = direction === 'long' ? currentPrice - sl : currentPrice + sl;
      tpPrice = direction === 'long' ? currentPrice + tp : currentPrice - tp;
    }

    // Build the full bias snapshot — include every item, default to false if not ticked
    const fullBiasChecked = biasItems.reduce<Record<string, boolean>>(
      (acc, item) => ({ ...acc, [item]: biasChecked[item] ?? false }),
      {}
    );

    onEnterTrade(direction, currentPrice, slPrice, tpPrice, fullBiasChecked);
    setSlInput('');
    setTpInput('');
    setBiasChecked({});
  }

  const slNum = parseFloat(slInput);
  const tpNum = parseFloat(tpInput);
  const hasRR = !isNaN(slNum) && !isNaN(tpNum) && slNum > 0 && tpNum > 0;
  const rrRatio = hasRR && inputMode === 'points' ? (tpNum / slNum).toFixed(1) : null;

  const checkedCount = biasItems.filter(k => biasChecked[k]).length;
  const allChecked = biasItems.length > 0 && checkedCount === biasItems.length;

  if (!isSubscribed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 12, textAlign: 'center', fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Upgrade to trade</div>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
          Unlock the replay simulator with a subscription.
        </div>
        <a
          href="/pricing"
          style={{
            display: 'block', width: '100%', padding: '11px',
            background: 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
            color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: 13,
            fontWeight: 700, textDecoration: 'none', textAlign: 'center',
            borderRadius: 999, marginTop: 4,
          }}
        >
          View plans
        </a>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      overflow: 'hidden', fontFamily: 'Inter, sans-serif',
    }}>

      {/* ── Price header ─────────────────────────────── */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
          Market price
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
          {currentPrice ? formatPrice(currentPrice) : '—'}
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Direction */}
        <div>
          <FieldLabel>Direction</FieldLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setDirection('long')}
              disabled={!!activeTrade}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
                cursor: activeTrade ? 'not-allowed' : 'pointer',
                opacity: activeTrade && direction !== 'long' ? 0.4 : 1,
                transition: 'opacity 0.12s',
                background: direction === 'long' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#F0FDF4',
                color: direction === 'long' ? '#fff' : '#10B981',
              }}
            >
              ▲ Long
            </button>
            <button
              onClick={() => setDirection('short')}
              disabled={!!activeTrade}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
                cursor: activeTrade ? 'not-allowed' : 'pointer',
                opacity: activeTrade && direction !== 'short' ? 0.4 : 1,
                transition: 'opacity 0.12s',
                background: direction === 'short' ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : '#FEF2F2',
                color: direction === 'short' ? '#fff' : '#EF4444',
              }}
            >
              ▼ Short
            </button>
          </div>
        </div>

        {/* Input mode */}
        <div>
          <FieldLabel>Input mode</FieldLabel>
          <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 3 }}>
            {(['price', 'points'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                style={{
                  flex: 1, padding: '5px 0', borderRadius: 6, border: 'none',
                  fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'background 0.12s, color 0.12s, box-shadow 0.12s',
                  background: inputMode === mode ? '#FFFFFF' : 'transparent',
                  color: inputMode === mode ? '#111827' : '#9CA3AF',
                  boxShadow: inputMode === mode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Stop Loss */}
        <div>
          <FieldLabel>Stop Loss {inputMode === 'points' ? '(pts)' : '(price)'}</FieldLabel>
          <input
            type="number"
            placeholder={inputMode === 'points' ? '8' : '4515.50'}
            value={slInput}
            onChange={e => setSlInput(e.target.value)}
            disabled={!!activeTrade}
            step="0.25"
            style={inputStyle(!!activeTrade)}
          />
        </div>

        {/* Take Profit */}
        <div>
          <FieldLabel>Take Profit {inputMode === 'points' ? '(pts)' : '(price)'}</FieldLabel>
          <input
            type="number"
            placeholder={inputMode === 'points' ? '16' : '4531.50'}
            value={tpInput}
            onChange={e => setTpInput(e.target.value)}
            disabled={!!activeTrade}
            step="0.25"
            style={inputStyle(!!activeTrade)}
          />
        </div>

        {/* RR preview */}
        {rrRatio && !activeTrade && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', background: '#EEF2FF', borderRadius: 8,
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Risk / Reward</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2962FF' }}>1 : {rrRatio}</span>
          </div>
        )}

        {/* ── Bias checklist (pre-entry only) ──────────── */}
        {biasItems.length > 0 && !activeTrade && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <FieldLabel>Pre-trade checklist</FieldLabel>
              {checkedCount > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: allChecked ? '#10B981' : '#F59E0B',
                  background: allChecked ? '#F0FDF4' : '#FFFBEB',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}>
                  {checkedCount}/{biasItems.length}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {biasItems.map(key => {
                const checked = biasChecked[key] ?? false;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleBias(key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: '1.5px solid',
                      borderColor: checked ? '#10B981' : '#E5E7EB',
                      background: checked ? '#F0FDF4' : '#F9FAFB',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'border-color 0.1s, background 0.1s',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: '1.5px solid',
                      borderColor: checked ? '#10B981' : '#D1D5DB',
                      background: checked ? '#10B981' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 0.1s, border-color 0.1s',
                    }}>
                      {checked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: checked ? '#065F46' : '#6B7280',
                      lineHeight: 1.3,
                    }}>
                      {formatBiasLabel(key)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Active trade summary ───────────────────────── */}
        {activeTrade && (
          <>
            <div style={{
              background: '#F8F9FA', borderRadius: 12, padding: '12px 14px', border: '1px solid #E5E7EB',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Active trade
              </div>
              <ActiveRow label="Direction">
                <span style={{ fontWeight: 700, color: activeTrade.direction === 'long' ? '#10B981' : '#EF4444' }}>
                  {activeTrade.direction === 'long' ? '▲ LONG' : '▼ SHORT'}
                </span>
              </ActiveRow>
              <ActiveRow label="Entry">
                <span style={{ color: '#111827' }}>{formatPrice(activeTrade.entryPrice)}</span>
              </ActiveRow>
              <div style={{ height: 1, background: '#E5E7EB', margin: '6px 0' }} />
              <ActiveRow label="Stop loss">
                <span style={{ color: '#EF4444' }}>{formatPrice(activeTrade.stopLoss)}</span>
              </ActiveRow>
              <ActiveRow label="Take profit">
                <span style={{ color: '#10B981' }}>{formatPrice(activeTrade.takeProfit)}</span>
              </ActiveRow>
            </div>

            {/* Checklist snapshot for the active trade */}
            {Object.keys(activeTrade.biasChecked).length > 0 && (
              <div style={{ padding: '10px 12px', background: '#F8F9FA', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Checklist at entry
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {Object.entries(activeTrade.biasChecked).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: val ? '#10B981' : '#D1D5DB' }}>
                        {val ? '✓' : '○'}
                      </span>
                      <span style={{ fontSize: 11, color: val ? '#374151' : '#9CA3AF' }}>
                        {formatBiasLabel(key)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 12, color: '#DC2626', padding: '8px 12px',
            background: '#FEF2F2', borderRadius: 8, border: '1px solid #FCA5A5',
          }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Footer CTA ────────────────────────────────── */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
        {!activeTrade ? (
          <button
            onClick={handleEnter}
            disabled={!currentPrice || !slInput || !tpInput}
            style={{
              width: '100%', padding: '12px',
              background: 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
              color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
              border: 'none', borderRadius: 999,
              cursor: (!currentPrice || !slInput || !tpInput) ? 'not-allowed' : 'pointer',
              opacity: (!currentPrice || !slInput || !tpInput) ? 0.4 : 1,
              transition: 'opacity 0.12s',
            }}
          >
            {biasItems.length > 0 && !allChecked && checkedCount === 0
              ? 'Enter trade (no checklist)'
              : biasItems.length > 0 && !allChecked
                ? `Enter trade (${checkedCount}/${biasItems.length} checked)`
                : 'Enter trade'}
          </button>
        ) : (
          <button
            onClick={onCloseTrade}
            style={{
              width: '100%', padding: '12px', background: 'transparent',
              color: '#EF4444', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
              border: '1.5px solid #EF4444', borderRadius: 999, cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            Close at market
          </button>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: '#9CA3AF',
      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function ActiveRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{children}</span>
    </div>
  );
}

function inputStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', background: '#F9FAFB', border: '1.5px solid #E5E7EB',
    color: '#111827', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
    padding: '9px 12px', borderRadius: 10, outline: 'none', boxSizing: 'border-box',
    opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'text',
  };
}
