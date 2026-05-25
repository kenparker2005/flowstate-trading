import { useState, useCallback, useEffect, useRef } from 'react';
import type { Candle, ReplayState, ReplayInitConfig } from '../types';
import { loadM1Data, aggregateCandles } from '../lib/replayData';

const INITIAL_BARS = 100;

const EMPTY_STATE: ReplayState = {
  candles: [], startOffset: 0, currentIndex: 0,
  totalCandles: 0, isRunning: false, revealDate: false,
};

// ── State builders ────────────────────────────────────────────────────────────

function buildState(
  all: Candle[],
  startOffset: number,
  currentIndex: number,
  revealDate: boolean,
): ReplayState {
  return {
    candles: all.slice(startOffset, currentIndex + 1),
    startOffset,
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
    const targetMs = new Date(iso).getTime();

    let firstIdx = all.findIndex(c => c.time * 1000 >= targetMs);
    if (firstIdx === -1) firstIdx = Math.max(0, all.length - INITIAL_BARS);
    const currentIndex = Math.min(firstIdx + INITIAL_BARS - 1, all.length - 1);
    return buildState(all, 0, currentIndex, true);
  }

  // Random mode — optionally anchored to a specific session time (HH:MM UTC)
  if (config?.sessionTime) {
    const [th, tm] = config.sessionTime.split(':').map(Number);

    // Collect all dataset indices whose UTC time falls within ±2 min of the target
    const candidates: number[] = [];
    for (let i = 0; i < all.length; i++) {
      const d = new Date(all[i].time * 1000);
      if (d.getUTCHours() === th && Math.abs(d.getUTCMinutes() - tm) <= 2) {
        candidates.push(i);
      }
    }

    if (candidates.length > 0) {
      // Exclude indices too close to either end of the dataset
      const safeMin = 100;
      const safeMax = all.length - 200;
      const pool = candidates.filter(i => i >= safeMin && i < safeMax);
      const chosen = (pool.length > 0 ? pool : candidates)[
        Math.floor(Math.random() * (pool.length > 0 ? pool : candidates).length)
      ];

      // Show ~30 bars of pre-session context so traders see what happened before open
      const contextBars = 30;
      const startOffset  = Math.max(0, chosen - contextBars);
      const currentIndex = Math.min(chosen + INITIAL_BARS - 1, all.length - 1);
      return buildState(all, startOffset, currentIndex, false);
    }
    // Fall through to pure random if no candles match the requested time
  }

  // Pure random — pick any position in the dataset
  const randomStart  = Math.floor(Math.random() * Math.max(all.length - 500, 1));
  const currentIndex = Math.min(randomStart + INITIAL_BARS - 1, all.length - 1);
  return buildState(all, randomStart, currentIndex, false);
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
  // Keep refs always current so effects can read without deps
  const tfRef           = useRef(timeframe);
  const stateRef        = useRef<ReplayState>(EMPTY_STATE);
  const firstLoadRef    = useRef(true);
  const initialCfgRef   = useRef(initialConfig);

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ReplayState>(EMPTY_STATE);

  // Keep refs in sync every render
  tfRef.current    = timeframe;
  stateRef.current = state;

  // ── Load M1 data when symbol changes ────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    loadM1Data(symbol)
      .then(m1 => {
        m1Ref.current = m1;
        const agg = aggregateCandles(m1, tfRef.current);
        aggRef.current = agg;
        const cfg = firstLoadRef.current ? initialCfgRef.current : undefined;
        firstLoadRef.current = false;
        setState(makeConfiguredState(agg, cfg));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // ── Re-aggregate when timeframe changes (skip the very first render) ─────────
  const prevTfRef = useRef<string>('');
  useEffect(() => {
    if (prevTfRef.current === timeframe) return; // skip initial mount
    prevTfRef.current = timeframe;

    if (!m1Ref.current.length) return; // data not loaded yet; symbol effect will handle it

    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    // Save current position as a timestamp so we can map into the new TF
    const cur = stateRef.current;
    const currentTs = aggRef.current[cur.currentIndex]?.time ?? 0;
    const startTs   = aggRef.current[cur.startOffset]?.time   ?? 0;

    const agg = aggregateCandles(m1Ref.current, timeframe);
    aggRef.current = agg;

    const newCurr  = currentTs ? findNearestIndex(agg, currentTs) : Math.min(INITIAL_BARS - 1, agg.length - 1);
    const newStart = startTs   ? Math.min(findNearestIndex(agg, startTs), newCurr) : 0;

    setState(prev => buildState(agg, newStart, newCurr, prev.revealDate));
  }, [timeframe]);

  // ── Playback controls ─────────────────────────────────────────────────────────

  const advance = useCallback((bars: number) => {
    setState(prev => {
      const all      = aggRef.current;
      const newIndex = Math.min(prev.currentIndex + bars, all.length - 1);
      return { ...prev, candles: all.slice(prev.startOffset, newIndex + 1), currentIndex: newIndex };
    });
  }, []);

  const advanceToEndOfDay = useCallback(() => {
    setState(prev => {
      const all         = aggRef.current;
      const current     = all[prev.currentIndex];
      const currentDay  = new Date(current.time * 1000).getUTCDate();
      let endIndex      = prev.currentIndex;
      for (let i = prev.currentIndex + 1; i < all.length; i++) {
        if (new Date(all[i].time * 1000).getUTCDate() !== currentDay) break;
        endIndex = i;
      }
      return { ...prev, candles: all.slice(prev.startOffset, endIndex + 1), currentIndex: endIndex };
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
        return { ...prev, candles: all.slice(prev.startOffset, ni + 1), currentIndex: ni };
      });
    }, 200);
  }, []);

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const reset = useCallback((config: ReplayInitConfig = { dateMode: 'random' }) => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
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
    advance,
    advanceToEndOfDay,
    startAutoPlay,
    stopAutoPlay,
    reset,
    toggleRevealDate,
  };
}
