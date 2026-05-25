export interface Candle {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1';

export type TradeDirection = 'long' | 'short';
export type TradeOutcome = 'win' | 'loss' | 'breakeven';
export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface ActiveTrade {
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  entryBar: number;
  biasChecked: Record<string, boolean>;
}

export interface ClosedTrade {
  id: string;
  sessionId: string;
  userId: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  entryBar: number;
  exitBar: number;
  outcome: TradeOutcome;
  pnlPips: number;
  rrAchieved: number;
  biasChecked: Record<string, boolean> | null;
  createdAt: string;
}

export interface TradeResult {
  outcome: TradeOutcome;
  pnlPips: number;
  rrAchieved: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  direction: TradeDirection;
  exitBar: number;
}

export interface Session {
  id: string;
  userId: string;
  pairId: number;
  timeframe: Timeframe;
  sessionName?: string;
  sessionDate: string;
  dateIsHidden: boolean;
  startedAt: string;
  endedAt?: string;
  status: SessionStatus;
}

export interface SessionConfig {
  name: string;
  symbol: 'ES' | 'NQ';
  dateMode: 'random' | 'specific';
  /** 'YYYY-MM-DDTHH:MM' (UTC) when dateMode === 'specific' */
  specificDate?: string;
  /** 'HH:MM' (UTC) session start time for random-date mode */
  sessionTime?: string;
}

export interface UserStats {
  userId: string;
  totalSessions: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  totalPips: number;
  bestStreak: number;
  currentStreak: number;
  updatedAt: string;
}

export interface Profile {
  id: string;
  email: string;
  username?: string;
  isSubscribed: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
}

export interface Pair {
  id: number;
  symbol: string;
  displayName: string;
  isActive: boolean;
}

export interface UserPreferences {
  userId: string;
  market: 'Forex' | 'Futures' | 'Other';
  session: string;
  accountSize: number;
  biasItems: string[];
  maxRisk: number;
  targetRR: number;
}

export interface ReplayState {
  candles: Candle[];
  /** Global index of the first visible candle in the full dataset */
  startOffset: number;
  currentIndex: number;
  totalCandles: number;
  isRunning: boolean;
  revealDate: boolean;
}

export interface ReplayInitConfig {
  dateMode: 'random' | 'specific';
  /** 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' (UTC) */
  specificDate?: string;
  /** 'HH:MM' (UTC) — when set in random mode, picks a random date at this time */
  sessionTime?: string;
}
