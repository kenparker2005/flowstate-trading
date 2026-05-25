import * as fs from 'fs';
import * as path from 'path';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function generateEURUSD(bars: number, startTimestamp: number): Candle[] {
  const candles: Candle[] = [];
  let price = 1.08500;
  const minuteSeconds = 60;

  for (let i = 0; i < bars; i++) {
    const time = startTimestamp + i * minuteSeconds;
    const open = price;
    const change = (Math.random() - 0.5) * 0.0008;
    const close = Math.max(1.05, Math.min(1.15, open + change));
    const highExtra = Math.random() * 0.0003;
    const lowExtra = Math.random() * 0.0003;
    const high = Math.max(open, close) + highExtra;
    const low = Math.min(open, close) - lowExtra;
    const volume = Math.floor(Math.random() * 500 + 100);
    candles.push({
      time,
      open: Math.round(open * 100000) / 100000,
      high: Math.round(high * 100000) / 100000,
      low: Math.round(low * 100000) / 100000,
      close: Math.round(close * 100000) / 100000,
      volume,
    });
    price = close;
  }
  return candles;
}

const startDate = new Date('2020-01-06T00:00:00Z');
const candles = generateEURUSD(2000, Math.floor(startDate.getTime() / 1000));

const outPath = path.join(__dirname, '..', 'data', 'sample', 'EURUSD_M1_sample.json');
fs.writeFileSync(outPath, JSON.stringify(candles, null, 2));
console.log(`Generated ${candles.length} candles → ${outPath}`);
