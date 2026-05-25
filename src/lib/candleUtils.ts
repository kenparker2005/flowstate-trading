import type { Candle, TradeDirection, TradeOutcome } from '../types';

// Futures use 0.25-point tick size (ES & NQ). Returns signed points.
export function priceToPoints(price1: number, price2: number): number {
  return Math.round((price2 - price1) * 100) / 100;
}

export function pointsToPrice(points: number, basePrice: number): number {
  return basePrice + points;
}

export function checkTradeHit(
  candle: Candle,
  direction: TradeDirection,
  stopLoss: number,
  takeProfit: number
): TradeOutcome | null {
  if (direction === 'long') {
    if (candle.low <= stopLoss) return 'loss';
    if (candle.high >= takeProfit) return 'win';
  } else {
    if (candle.high >= stopLoss) return 'loss';
    if (candle.low <= takeProfit) return 'win';
  }
  return null;
}

export function calculateRR(
  entryPrice: number,
  exitPrice: number,
  stopLoss: number,
  direction: TradeDirection
): number {
  const risk = Math.abs(entryPrice - stopLoss);
  if (risk === 0) return 0;
  const reward = direction === 'long' ? exitPrice - entryPrice : entryPrice - exitPrice;
  return Math.round((reward / risk) * 100) / 100;
}

export function getExitPrice(
  candle: Candle,
  outcome: TradeOutcome,
  direction: TradeDirection,
  stopLoss: number,
  takeProfit: number
): number {
  if (outcome === 'win') return takeProfit;
  if (outcome === 'loss') return stopLoss;
  return direction === 'long' ? candle.close : candle.close;
}

// Futures prices: 2 decimal places (e.g. 4523.50, 15234.25)
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

export function formatPoints(points: number): string {
  const sign = points >= 0 ? '+' : '';
  return `${sign}${points.toFixed(2)}`;
}
