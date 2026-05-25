/**
 * Generates realistic M1 candlestick data for ES and NQ futures.
 *
 * Session window: Full CME Globex session
 *   Mon–Thu:  23:00 UTC prev-day → 22:00 UTC (maintenance 22:xx UTC)
 *   Friday:   closes at 22:00 UTC, does not reopen until Sunday
 *   Sunday:   opens at 23:00 UTC (Globex weekly open)
 *
 * This covers:
 *   Asian session  — 23:00 UTC (6 PM ET reopening after maintenance)
 *   London session — 08:00 UTC (3 AM ET, European open)
 *   NY session     — 14:30 UTC (9:30 AM ET, NYSE open)
 *
 * Output: public/data/{ES,NQ}_M1.json  (full datasets, served via fetch)
 *         data/sample/{ES,NQ}_M1_sample.json  (first 2 000 bars, legacy)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Maths ─────────────────────────────────────────────────────────────────────

let _spare = null;
function randn() {
  if (_spare !== null) { const v = _spare; _spare = null; return v; }
  let u, v, s;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const m = Math.sqrt(-2 * Math.log(s) / s);
  _spare = v * m;
  return u * m;
}

const snap = p => Math.round(p * 4) / 4;

// ── Session calendar ──────────────────────────────────────────────────────────

/**
 * Returns true for minutes that CME Globex is open for ES / NQ.
 *
 * Rules (all times UTC):
 *  - Saturday: always closed
 *  - Sunday  : closed before 23:00
 *  - 22:xx   : daily maintenance window — closed every weekday
 *  - Fri 23:xx: closed (market shuts at 22:00 Fri, next open is Sun 23:00)
 */
function isTradingMinute(ts) {
  const d   = new Date(ts * 1000);
  const dow = d.getUTCDay();   // 0=Sun, 6=Sat
  const h   = d.getUTCHours();

  if (dow === 6)                  return false; // Saturday
  if (dow === 0 && h < 23)        return false; // Sunday pre-open
  if (h === 22)                   return false; // maintenance window
  if (dow === 5 && h === 23)      return false; // Friday overnight closed
  return true;
}

// ── Intraday volatility shaping ───────────────────────────────────────────────

/**
 * Volatility multiplier relative to Asian session baseline.
 * Drives realistic session structure: quiet overnight → spike at London/NY opens.
 */
function volMult(utcH, utcM) {
  const t = utcH + utcM / 60;

  if (t >= 13.4 && t < 14.0)  return 3.2;  // NY Open surge
  if (t >= 14.0 && t < 17.5)  return 2.0;  // NY Morning
  if (t >= 17.5 && t < 20.0)  return 1.5;  // NY Afternoon
  if (t >= 20.0 && t < 21.0)  return 1.0;  // NY Close
  if (t >= 7.5  && t < 9.5)   return 1.4;  // London Open
  if (t >= 9.5  && t < 12.0)  return 1.0;  // London Mid
  if (t >= 12.0 && t < 13.4)  return 0.9;  // US Pre-market
  return 0.35;                               // Asian / overnight
}

// ── Core generator ────────────────────────────────────────────────────────────

function generate({ symbol, startPrice, annualVol, annualDrift, startTs, weeks }) {
  // Per-minute σ from annual figure.
  // Full Globex session ≈ 23h/day × 5 days × 52 weeks ≈ 299 880 min/yr
  const minSigma  = annualVol   / Math.sqrt(52 * 5 * 23 * 60);
  const dailyDrift = annualDrift / (52 * 5); // per trading day

  const candles    = [];
  let price        = startPrice;
  let sessionOpen  = startPrice;
  let prevDateStr  = '';
  let volScale     = 1.0;

  const endTs = startTs + weeks * 7 * 24 * 3600;

  for (let ts = startTs; ts < endTs; ts += 60) {
    if (!isTradingMinute(ts)) continue;

    const d       = new Date(ts * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const h       = d.getUTCHours();
    const m       = d.getUTCMinutes();

    // ── New UTC calendar day ──────────────────────────────────────────────────
    if (dateStr !== prevDateStr) {
      prevDateStr  = dateStr;
      sessionOpen  = price;

      // Overnight gap: small noise so daily drift reliably dominates
      const gapNoise = randn() * minSigma * 1.5;
      price          = snap(price * (1 + dailyDrift + gapNoise));

      // Slowly decay vol cluster back toward baseline
      volScale = 0.90 * volScale + 0.10;
    }

    // ── Intraday dynamics ─────────────────────────────────────────────────────
    const reversion = 0.0010 * (sessionOpen - price) / sessionOpen;

    // Occasional news / data spike (~1 per 500 min ≈ once per session)
    if (Math.random() < 0.002) {
      volScale = Math.max(volScale, 1.6 + Math.random() * 1.2);
    } else {
      volScale = Math.max(1.0, volScale * 0.997);
    }

    const mult  = volMult(h, m) * volScale;
    const sigma = minSigma * mult;
    const step  = reversion + randn() * sigma;

    const open  = snap(price);
    price       = snap(price * (1 + step));
    const close = snap(price);

    const wickH = Math.abs(randn()) * sigma * open * 0.65;
    const wickL = Math.abs(randn()) * sigma * open * 0.65;
    const high  = snap(Math.max(open, close) + wickH);
    const low   = snap(Math.min(open, close) - wickL);

    const baseVol = mult * mult * 120;
    const volume  = Math.max(10, Math.round(baseVol + Math.abs(randn()) * baseVol));

    candles.push([ts, open, high, low, close, volume]);
  }

  const first     = candles[0];
  const last      = candles[candles.length - 1];
  const returnPct = (((last[4] / first[1]) - 1) * 100).toFixed(1);
  console.log(`${symbol}: ${candles.length.toLocaleString()} M1 bars, return=${returnPct}%`);
  console.log(`  ${new Date(first[0] * 1000).toISOString().slice(0, 10)} open=${first[1]}  →  ${new Date(last[0] * 1000).toISOString().slice(0, 10)} close=${last[4]}`);
  return candles;
}

// ── Run ───────────────────────────────────────────────────────────────────────

// Sunday 2023-01-01 23:00 UTC — first minute of the Globex weekly open
const START_TS = Math.floor(new Date('2023-01-01T23:00:00Z').getTime() / 1000);

const publicDir = path.join(__dirname, '..', 'public', 'data');
const sampleDir = path.join(__dirname, '..', 'data', 'sample');
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(sampleDir, { recursive: true });

console.log('=== ES (S&P 500 E-mini) ===');
const esCandles = generate({
  symbol: 'ES', startPrice: 3823.75,
  annualVol: 0.14, annualDrift: 0.24,
  startTs: START_TS, weeks: 20,   // ~5 months
});
fs.writeFileSync(path.join(publicDir, 'ES_M1.json'), JSON.stringify(esCandles));
// Legacy sample in object format for any old code still importing directly
const toObj = ([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume });
fs.writeFileSync(path.join(sampleDir, 'ES_M1_sample.json'), JSON.stringify(esCandles.slice(0, 2000).map(toObj)));

console.log('\n=== NQ (Nasdaq-100 E-mini) ===');
const nqCandles = generate({
  symbol: 'NQ', startPrice: 11175.25,
  annualVol: 0.22, annualDrift: 0.48,
  startTs: START_TS, weeks: 20,
});
fs.writeFileSync(path.join(publicDir, 'NQ_M1.json'), JSON.stringify(nqCandles));
fs.writeFileSync(path.join(sampleDir, 'NQ_M1_sample.json'), JSON.stringify(nqCandles.slice(0, 2000).map(toObj)));

console.log('\nDone — public/data/ and data/sample/ updated');
