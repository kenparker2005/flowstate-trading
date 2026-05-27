import type { Candle } from '../types';

// ── Module-level cache (survives component unmounts) ──────────────────────────

const M1_CACHE: Record<string, Candle[]> = {};

// Single in-flight promise per symbol – prevents duplicate fetches
const M1_PENDING: Partial<Record<string, Promise<Candle[]>>> = {};

// Data files use compact array format: [time, open, high, low, close, volume]
type CompactCandle = [number, number, number, number, number, number];

function decodeCandles(raw: CompactCandle[]): Candle[] {
  return raw.map(([time, open, high, low, close, volume]) => ({
    time, open, high, low, close, volume,
  }));
}

export async function loadM1Data(symbol: string): Promise<Candle[]> {
  if (M1_CACHE[symbol]) return M1_CACHE[symbol];
  if (M1_PENDING[symbol]) return M1_PENDING[symbol];

  M1_PENDING[symbol] = fetch(`/data/${symbol}_M1.json`)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load ${symbol} data (${res.status})`);
      return res.json() as Promise<CompactCandle[]>;
    })
    .then(raw => {
      const data = decodeCandles(raw);
      M1_CACHE[symbol] = data;
      delete M1_PENDING[symbol];
      return data;
    });

  return M1_PENDING[symbol];
}

/** Returns the cached M1 data synchronously (empty array if not yet loaded). */
export function getCachedM1(symbol: string): Candle[] {
  return M1_CACHE[symbol] ?? [];
}

// ── Timeframe aggregation ─────────────────────────────────────────────────────

const TF_MINUTES: Record<string, number> = {
  M1: 1, M2: 2, M3: 3, M5: 5, M10: 10, M15: 15,
  M30: 30, M45: 45, H1: 60, H4: 240, D1: 1440, W1: 10080,
};

export function aggregateCandles(m1: Candle[], timeframe: string): Candle[] {
  const mins = TF_MINUTES[timeframe] ?? 1;
  if (mins === 1) return m1;

  const periodSecs = mins * 60;
  const out: Candle[] = [];
  let i = 0;

  while (i < m1.length) {
    const bar    = m1[i];
    const bucket = Math.floor(bar.time / periodSecs) * periodSecs;

    let open   = bar.open;
    let high   = bar.high;
    let low    = bar.low;
    let close  = bar.close;
    let volume = bar.volume;
    let j      = i + 1;

    while (j < m1.length) {
      const nb = Math.floor(m1[j].time / periodSecs) * periodSecs;
      if (nb !== bucket) break;
      if (m1[j].high > high) high   = m1[j].high;
      if (m1[j].low  < low)  low    = m1[j].low;
      close   = m1[j].close;
      volume += m1[j].volume;
      j++;
    }

    out.push({ time: bucket, open, high, low, close, volume });
    i = j;
  }

  return out;
}

// ── Available dates (for date-picker in NewSessionModal) ─────────────────────

export function getAvailableDates(symbol: string): string[] {
  const data = M1_CACHE[symbol] ?? [];
  const seen = new Set<string>();
  for (const c of data) {
    seen.add(new Date(c.time * 1000).toISOString().split('T')[0]);
  }
  return Array.from(seen).sort();
}

// ── Preloader (call from Dashboard so data is ready when modal opens) ─────────

export function preloadData(): void {
  loadM1Data('ES').catch(console.error);
  loadM1Data('NQ').catch(console.error);
}
