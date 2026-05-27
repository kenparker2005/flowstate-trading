import { useState, useCallback, useEffect, useRef } from 'react';
import type { Candle, ReplayState, ReplayInitConfig } from '../types';
import { loadM1Data, aggregateCandles } from '../lib/replayData';

const EMPTY_STATE: ReplayState = {
  candles: [], startOffset: 0, currentIndex: 0,
  totalCandles: 0, isRunning: false, revealDate: false,
};

// ── State builders ────────────────────────────────────────────────────────────

// Always loads the full history from bar 0 up to currentIndex.
// startOffset is kept at 0 for API compatibility.
function buildState(
  all: Candle[],
  currentIndex: number,
  revealDate: boolean,
): ReplayState {
  return {
    candles: all.slice(0, currentIndex + 1),
    startOffset: 0,
    currentIndex,
    totalCandles: all.length,
    isRunning: false,
    revealDate,
  };
}

function makeConfiguredState(all: Candle[], config?: ReplayInitConfig): ReplayState {
  if (!all.length) return EMPTY_STATE;

  if (config?.dateMode === 'specific' && config.specificDate) {
    const raw = config.specificDate;
    const iso = /Z$|[+-]\d{2}:\d{2}$/.test(raw)
      ? raw
      : raw.includes('T') ? raw + ':00Z' : raw + 'T00:00:00Z';
    const targetSec = Math.floor(new Date(iso).getTime() / 1000);

    // Use the last candle AT or before the target time (graceful gap handling)
    const currentIndex = findNearestIndex(all, targetSec);
    return buildState(all, currentIndex, true);
  }

  // Random mode — optionally anchored to a specific session time (HH:MM UTC)
  if (config?.sessionTime) {
    const [th, tm] = config.sessionTime.split(':').map(Number);

    // Collect one index per trading day: the first candle at or after th:tm on that day.
    // We key by UTC date string so we get exactly one candidate per day.
    const dayMap = new Map<string, number>();
    for (let i = 0; i < all.length; i++) {
      const d = new Date(all[i].time * 1000);
      const h = d.getUTCHours();
      const m = d.getUTCMinutes();
      // Accept exact minute or the first candle within +4 min (handles small aggregation gaps)
      if (h === th && m >= tm && m <= tm + 4) {
        const dayKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        if (!dayMap.has(dayKey)) dayMap.set(dayKey, i);
      }
    }

    if (dayMap.size > 0) {
      const candidates = Array.from(dayMap.values());
      // Ensure the chosen day has enough bars after it for meaningful replay
      const safeMax = all.length - 50;
      const pool = candidates.filter(i => i < safeMax);
      const chosen = (pool.length > 0 ? pool : candidates)[
        Math.floor(Math.random() * (pool.length > 0 ? pool.length : candidates.length))
      ];
      // The session open candle IS the last visible bar — user replays forward from here
      return buildState(all, chosen, false);
    }
    // Fall through to pure random if no candles match the requested time (e.g. D1 with intraday time)
  }

  // Pure random — pick any position ensuring at least some bars before and after
  const safeMin  = Math.min(50, Math.floor(all.length * 0.05));
  const safeMax  = Math.max(safeMin + 1, all.length - 50);
  const randomStart = safeMin + Math.floor(Math.random() * (safeMax - safeMin));
  return buildState(all, randomStart, false);
}

// Binary search: last index whose time ≤ ts
function findNearestIndex(candles: Candle[], ts: number): number {
  let lo = 0, hi = candles.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (candles[mid].time <= ts) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useReplay(
  symbol: string,
  timeframe: string,
  initialConfig?: ReplayInitConfig,
) {
  const m1Ref           = useRef<Candle[]>([]);
  const aggRef          = useRef<Candle[]>([]);
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const tfRef           = useRef(timeframe);
  const stateRef        = useRef<ReplayState>(EMPTY_STATE);
  const firstLoadRef    = useRef(true);
  const initialCfgRef   = useRef(initialConfig);
  // Increments whenever the chart needs a full data reload (initial load, TF switch, new session)
  const resetVersionRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ReplayState>(EMPTY_STATE);

  tfRef.current    = timeframe;
  stateRef.current = state;

  // ── Load M1 data when symbol changes ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    loadM1Data(symbol)
      .then(m1 => {
        if (cancelled) return;
        m1Ref.current = m1;
        const agg = aggregateCandles(m1, tfRef.current);
        aggRef.current = agg;
        const cfg = firstLoadRef.current ? initialCfgRef.current : undefined;
        firstLoadRef.current = false;
        resetVersionRef.current++;
        setState(makeConfiguredState(agg, cfg));
      })
      .catch(e => { if (!cancelled) console.error(e); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // ── Re-aggregate when timeframe changes ──────────────────────────────────────
  const prevTfRef = useRef<string>('');
  useEffect(() => {
    if (prevTfRef.current === timeframe) return;
    prevTfRef.current = timeframe;

    if (!m1Ref.current.length) return;

    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    const currentTs = aggRef.current[stateRef.current.currentIndex]?.time ?? 0;

    const agg = aggregateCandles(m1Ref.current, timeframe);
    aggRef.current = agg;

    const newCurr = currentTs
      ? findNearestIndex(agg, currentTs)
      : Math.max(0, agg.length - 1);

    resetVersionRef.current++;
    setState(prev => buildState(agg, newCurr, prev.revealDate));
  }, [timeframe]);

  // ── Playback controls ─────────────────────────────────────────────────────────

  const advance = useCallback((bars: number) => {
    setState(prev => {
      const all      = aggRef.current;
      const newIndex = Math.min(prev.currentIndex + bars, all.length - 1);
      return { ...prev, candles: all.slice(0, newIndex + 1), currentIndex: newIndex };
    });
  }, []);

  const advanceToEndOfDay = useCallback(() => {
    setState(prev => {
      const all        = aggRef.current;
      const current    = all[prev.currentIndex];
      const currentDay = new Date(current.time * 1000).getUTCDate();
      let endIndex     = prev.currentIndex;
      for (let i = prev.currentIndex + 1; i < all.length; i++) {
        if (new Date(all[i].time * 1000).getUTCDate() !== currentDay) break;
        endIndex = i;
      }
      return { ...prev, candles: all.slice(0, endIndex + 1), currentIndex: endIndex };
    });
  }, []);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) return;
    setState(prev => ({ ...prev, isRunning: true }));
    intervalRef.current = setInterval(() => {
      setState(prev => {
        const all = aggRef.current;
        if (prev.currentIndex >= all.length - 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return { ...prev, isRunning: false };
        }
        const ni = prev.currentIndex + 1;
        return { ...prev, candles: all.slice(0, ni + 1), currentIndex: ni };
      });
    }, 200);
  }, []);

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const reset = useCallback((config: ReplayInitConfig = { dateMode: 'random' }) => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    resetVersionRef.current++;
    setState(makeConfiguredState(aggRef.current, config));
  }, []);

  const toggleRevealDate = useCallback(() => {
    setState(prev => ({ ...prev, revealDate: !prev.revealDate }));
  }, []);

  const currentCandle = state.candles[state.candles.length - 1] ?? null;

  return {
    state,
    loading,
    currentCandle,
    resetVersion: resetVersionRef.current,
    advance,
    advanceToEndOfDay,
    startAutoPlay,
    stopAutoPlay,
    reset,
    toggleRevealDate,
  };
}
