import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { SessionConfig, ReplayInitConfig } from '../types';
import { useReplay } from '../hooks/useReplay';
import { useTrade } from '../hooks/useTrade';
import { useSession } from '../hooks/useSession';
import { supabase } from '../lib/supabase';
import { ChartContainer } from '../components/Chart/ChartContainer';
import { TradePanel } from '../components/TradePanel/TradePanel';
import { ReplayControls } from '../components/ReplayControls/ReplayControls';
import { ResultModal } from '../components/ResultModal/ResultModal';
import type { TradeDirection, TradeResult } from '../types';

const PAIRS = [
  { id: 1, symbol: 'ES', label: 'ES  S&P 500' },
  { id: 2, symbol: 'NQ', label: 'NQ  Nasdaq' },
];

const TIMEFRAMES = [
  { value: 'M1',  label: '1min'  },
  { value: 'M5',  label: '5min'  },
  { value: 'M15', label: '15min' },
  { value: 'H1',  label: '1hr'   },
  { value: 'H4',  label: '4hr'   },
];

const S = {
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#F8F9FA',
    overflow: 'hidden',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    height: 56,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    background: '#FFFFFF',
    borderBottom: '1px solid #F3F4F6',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    paddingLeft: 20,
    paddingRight: 20,
    gap: 0,
    zIndex: 10,
  },
  logo: {
    fontWeight: 800,
    fontSize: 17,
    color: '#111827',
    letterSpacing: '-0.03em',
    marginRight: 24,
    flexShrink: 0,
    textDecoration: 'none',
  },
  divider: {
    width: 1,
    height: 18,
    background: '#E5E7EB',
    margin: '0 16px',
    flexShrink: 0,
  },
  spacer: { flex: 1 },
};

export function Simulator() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const sessionConfig = (location.state as { sessionConfig?: SessionConfig } | null)?.sessionConfig ?? null;

  const [selectedPair, setSelectedPair] = useState(() => {
    if (sessionConfig?.symbol) {
      return PAIRS.find(p => p.symbol === sessionConfig.symbol) ?? PAIRS[0];
    }
    return PAIRS[0];
  });
  const [selectedTf, setSelectedTf] = useState('M1');
  const [pendingResult, setPendingResult] = useState<TradeResult | null>(null);
  const [lastResult, setLastResult] = useState<TradeResult | null>(null);
  const [biasItems, setBiasItems] = useState<string[]>([]);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const autoStartedRef = useRef(false);

  const replayInitConfig: ReplayInitConfig | undefined = sessionConfig
    ? {
        dateMode: sessionConfig.dateMode,
        specificDate: sessionConfig.specificDate,
        sessionTime: sessionConfig.sessionTime,
      }
    : undefined;
  const replay = useReplay(selectedPair.symbol, selectedTf, replayInitConfig);
  const { session, startSession } = useSession(user?.id ?? null);

  // Load the user's bias checklist items from preferences
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('user_preferences')
      .select('bias_items')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.bias_items) setBiasItems(data.bias_items);
      });
  }, [user?.id]);

  // Create the DB session record once user is ready (chart state is already correct from initialConfig)
  useEffect(() => {
    if (!sessionConfig || autoStartedRef.current || !user?.id) return;
    autoStartedRef.current = true;
    startSession(selectedPair.id, selectedTf, {
      name: sessionConfig.name,
      sessionDate: sessionConfig.specificDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      dateIsHidden: sessionConfig.dateMode === 'random',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleTradeClose = useCallback((result: TradeResult) => {
    setPendingResult(result);
    setLastResult(result);
  }, []);

  const trade = useTrade({
    sessionId: session?.id ?? null,
    userId: user?.id ?? null,
    symbol: selectedPair.symbol,
    onTradeClose: handleTradeClose,
    onTradeSaved: (ok) => {
      setToast({ text: ok ? 'Trade saved' : 'Save failed — check console', ok });
      setTimeout(() => setToast(null), 3000);
    },
  });

  useEffect(() => {
    const lastCandle = replay.currentCandle;
    if (lastCandle && trade.activeTrade) {
      trade.checkAndClose(lastCandle, replay.state.currentIndex);
    }
  }, [replay.state.currentIndex, replay.currentCandle, trade]);

  function handleEnterTrade(
    direction: TradeDirection,
    entry: number,
    sl: number,
    tp: number,
    biasChecked: Record<string, boolean>
  ) {
    trade.enterTrade(direction, entry, sl, tp, replay.state.currentIndex, biasChecked);
  }

  async function handleNewSession() {
    replay.reset({ dateMode: 'random' });
    if (user?.id) {
      await startSession(selectedPair.id, selectedTf, { dateIsHidden: true });
    }
  }

  const currentPrice = replay.currentCandle?.close ?? null;
  const isSubscribed = profile?.isSubscribed ?? false;

  return (
    <div style={S.root}>

      {/* ── Header ───────────────────────────────────── */}
      <header style={S.header}>
        <Link to="/app/dashboard" style={{ ...S.logo, textDecoration: 'none' }}>
          FlowState<span style={{ color: '#2962FF' }}>Trading</span>
        </Link>

        {/* Pair pills */}
        <div style={{ display: 'flex', gap: 4, marginRight: 12 }}>
          {PAIRS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPair(p)}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                border: 'none',
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
                background: selectedPair.id === p.id ? '#2962FF' : 'transparent',
                color: selectedPair.id === p.id ? '#fff' : '#6B7280',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={S.divider} />

        {/* Timeframe pills */}
        <div style={{ display: 'flex', gap: 4, marginRight: 16 }}>
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              onClick={() => setSelectedTf(tf.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                border: 'none',
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
                background: selectedTf === tf.value ? '#EEF2FF' : 'transparent',
                color: selectedTf === tf.value ? '#2962FF' : '#9CA3AF',
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div style={S.divider} />

        {/* Actions */}
        <button
          onClick={handleNewSession}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: '1.5px solid #E5E7EB',
            background: 'transparent',
            color: '#6B7280',
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            marginRight: 8,
            transition: 'border-color 0.12s, color 0.12s',
          }}
        >
          New session
        </button>

        {/* Session name badge */}
        {sessionConfig?.name && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#6B7280',
            background: '#F3F4F6', borderRadius: 6, padding: '4px 10px',
            marginRight: 8, maxWidth: 180, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {sessionConfig.name}
          </span>
        )}

        {/* Reveal date — hidden when user explicitly picked the date */}
        {sessionConfig?.dateMode !== 'specific' && (
          <button
            onClick={replay.toggleRevealDate}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1.5px solid',
              borderColor: replay.state.revealDate ? '#2962FF' : '#E5E7EB',
              background: replay.state.revealDate ? '#EEF2FF' : 'transparent',
              color: replay.state.revealDate ? '#2962FF' : '#6B7280',
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            {replay.state.revealDate ? 'Hide date' : 'Reveal date'}
          </button>
        )}

        {replay.state.revealDate && replay.currentCandle && (
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            color: '#2962FF',
            marginLeft: 10,
          }}>
            {new Date(replay.currentCandle.time * 1000).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </span>
        )}

        <div style={S.spacer} />

        {/* Nav */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {[
            { label: 'Dashboard', href: '/app/dashboard' },
            { label: 'Stats',     href: '/app/stats'     },
            { label: 'Bias',      href: '/app/bias'      },
            { label: 'Review',    href: '/app/review'    },
            { label: 'Settings',  href: '/app/settings'  },
          ].map(item => (
            <Link
              key={item.href}
              to={item.href}
              style={{
                padding: '5px 11px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                color: '#6B7280',
                textDecoration: 'none',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, padding: 16, gap: 16 }}>

        {/* Chart + replay controls */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E5E7EB',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          position: 'relative',
        }}>
          {replay.loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.85)',
              borderRadius: 16,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 32, height: 32, border: '3px solid #E5E7EB',
                  borderTopColor: '#2962FF', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  margin: '0 auto 10px',
                }} />
                <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                  Loading chart data…
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
            <ChartContainer
              candles={replay.state.candles}
              activeTrade={trade.activeTrade}
              lastResult={lastResult}
              revealDate={replay.state.revealDate}
            />
          </div>
          <ReplayControls
            onAdvance={replay.advance}
            onAutoPlay={replay.startAutoPlay}
            onStop={replay.stopAutoPlay}
            isRunning={replay.state.isRunning}
            currentIndex={replay.state.currentIndex}
            totalCandles={replay.state.totalCandles}
          />
        </div>

        {/* Trade panel */}
        <div style={{
          width: 240,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E5E7EB',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <TradePanel
            currentPrice={currentPrice}
            activeTrade={trade.activeTrade}
            biasItems={biasItems}
            onEnterTrade={handleEnterTrade}
            onCloseTrade={() => {
              if (replay.currentCandle) {
                trade.closeManualy(replay.currentCandle, replay.state.currentIndex);
              }
            }}
            error={trade.error}
            isSubscribed={isSubscribed}
          />
        </div>
      </div>

      {/* Result modal */}
      {pendingResult && (
        <ResultModal
          result={pendingResult}
          onContinue={() => setPendingResult(null)}
          onEndSession={() => {
            setPendingResult(null);
            handleNewSession();
          }}
        />
      )}

      {/* Save toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          padding: '10px 18px',
          borderRadius: 10,
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          background: toast.ok ? '#16A34A' : '#DC2626',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          pointerEvents: 'none',
        }}>
          {toast.ok ? '✓ ' : '✕ '}{toast.text}
        </div>
      )}
    </div>
  );
}
