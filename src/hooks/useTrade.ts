import { useState, useCallback } from 'react';
import type { ActiveTrade, ClosedTrade, TradeDirection, TradeResult, Candle } from '../types';
import { checkTradeHit, calculateRR, priceToPoints } from '../lib/candleUtils';
import { supabase } from '../lib/supabase';

interface UseTradeOptions {
  sessionId: string | null;
  userId: string | null;
  symbol: string;
  onTradeClose: (result: TradeResult) => void;
  onTradeSaved?: (ok: boolean) => void;
}

export function useTrade({ sessionId, userId, onTradeClose, onTradeSaved }: UseTradeOptions) {
  const [activeTrade, setActiveTrade] = useState<ActiveTrade | null>(null);
  const [trades, setTrades] = useState<ClosedTrade[]>([]);
  const [error, setError] = useState<string | null>(null);

  const enterTrade = useCallback((
    direction: TradeDirection,
    entryPrice: number,
    stopLoss: number,
    takeProfit: number,
    barIndex: number,
    biasChecked: Record<string, boolean>
  ) => {
    if (activeTrade) {
      setError('A trade is already active.');
      return;
    }
    setError(null);
    setActiveTrade({ direction, entryPrice, stopLoss, takeProfit, entryBar: barIndex, biasChecked });
  }, [activeTrade]);

  const checkAndClose = useCallback(async (candle: Candle, barIndex: number) => {
    if (!activeTrade) return;

    const hit = checkTradeHit(candle, activeTrade.direction, activeTrade.stopLoss, activeTrade.takeProfit);
    if (!hit) return;

    const exitPrice = hit === 'win' ? activeTrade.takeProfit : activeTrade.stopLoss;
    const rawPoints = priceToPoints(activeTrade.entryPrice, exitPrice);
    const pnlPips = rawPoints * (activeTrade.direction === 'long' ? 1 : -1);
    const rrAchieved = calculateRR(activeTrade.entryPrice, exitPrice, activeTrade.stopLoss, activeTrade.direction);

    const result: TradeResult = {
      outcome: hit,
      pnlPips,
      rrAchieved,
      entryPrice: activeTrade.entryPrice,
      exitPrice,
      stopLoss: activeTrade.stopLoss,
      takeProfit: activeTrade.takeProfit,
      direction: activeTrade.direction,
      exitBar: barIndex,
    };

    const tradeId = crypto.randomUUID();
    const closedTrade: ClosedTrade = {
      id: tradeId,
      sessionId: sessionId ?? '',
      userId: userId ?? '',
      direction: activeTrade.direction,
      entryPrice: activeTrade.entryPrice,
      exitPrice,
      stopLoss: activeTrade.stopLoss,
      takeProfit: activeTrade.takeProfit,
      entryBar: activeTrade.entryBar,
      exitBar: barIndex,
      outcome: hit,
      pnlPips,
      rrAchieved,
      biasChecked: activeTrade.biasChecked,
      createdAt: new Date().toISOString(),
    };

    setTrades(prev => [...prev, closedTrade]);
    setActiveTrade(null);

    if (sessionId && userId) {
      const { error: dbError } = await supabase.from('trades').insert({
        id: tradeId,
        session_id: sessionId,
        user_id: userId,
        direction: activeTrade.direction,
        entry_price: activeTrade.entryPrice,
        exit_price: exitPrice,
        stop_loss: activeTrade.stopLoss,
        take_profit: activeTrade.takeProfit,
        entry_bar: activeTrade.entryBar,
        exit_bar: barIndex,
        outcome: hit,
        pnl_pips: pnlPips,
        rr_achieved: rrAchieved,
        bias_checked: activeTrade.biasChecked,
      });
      if (dbError) {
        console.error('[useTrade] Failed to save trade to database:', dbError);
        onTradeSaved?.(false);
      } else {
        onTradeSaved?.(true);
      }
    }

    onTradeClose(result);
  }, [activeTrade, sessionId, userId, onTradeClose, onTradeSaved]);

  const closeManualy = useCallback(async (candle: Candle, barIndex: number) => {
    if (!activeTrade) return;

    const exitPrice = candle.close;
    const rawPoints = priceToPoints(activeTrade.entryPrice, exitPrice);
    const pnlPips = rawPoints * (activeTrade.direction === 'long' ? 1 : -1);
    const rrAchieved = calculateRR(activeTrade.entryPrice, exitPrice, activeTrade.stopLoss, activeTrade.direction);
    const outcome = pnlPips > 1 ? 'win' : pnlPips < -1 ? 'loss' : 'breakeven';

    const result: TradeResult = {
      outcome,
      pnlPips,
      rrAchieved,
      entryPrice: activeTrade.entryPrice,
      exitPrice,
      stopLoss: activeTrade.stopLoss,
      takeProfit: activeTrade.takeProfit,
      direction: activeTrade.direction,
      exitBar: barIndex,
    };

    const tradeId = crypto.randomUUID();
    const closedTrade: ClosedTrade = {
      id: tradeId,
      sessionId: sessionId ?? '',
      userId: userId ?? '',
      ...result,
      entryBar: activeTrade.entryBar,
      biasChecked: activeTrade.biasChecked,
      createdAt: new Date().toISOString(),
    };

    setTrades(prev => [...prev, closedTrade]);
    setActiveTrade(null);

    if (sessionId && userId) {
      const { error: dbError } = await supabase.from('trades').insert({
        id: tradeId,
        session_id: sessionId,
        user_id: userId,
        direction: activeTrade.direction,
        entry_price: activeTrade.entryPrice,
        exit_price: exitPrice,
        stop_loss: activeTrade.stopLoss,
        take_profit: activeTrade.takeProfit,
        entry_bar: activeTrade.entryBar,
        exit_bar: barIndex,
        outcome,
        pnl_pips: pnlPips,
        rr_achieved: rrAchieved,
        bias_checked: activeTrade.biasChecked,
      });
      if (dbError) {
        console.error('[useTrade] Failed to save trade to database:', dbError);
        onTradeSaved?.(false);
      } else {
        onTradeSaved?.(true);
      }
    }

    onTradeClose(result);
  }, [activeTrade, sessionId, userId, onTradeClose, onTradeSaved]);

  return { activeTrade, trades, error, enterTrade, checkAndClose, closeManualy };
}
