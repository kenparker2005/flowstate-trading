import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '../types';

export function useSession(userId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async (
    pairId: number,
    timeframe: string,
    opts: { name?: string; sessionDate?: string; dateIsHidden?: boolean } = {},
  ) => {
    if (!userId) return null;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        pair_id: pairId,
        timeframe,
        session_name: opts.name || null,
        session_date: opts.sessionDate ?? new Date().toISOString().split('T')[0],
        date_is_hidden: opts.dateIsHidden ?? true,
        status: 'active',
      })
      .select()
      .single();

    setLoading(false);

    if (err || !data) {
      setError(err?.message ?? 'Failed to start session');
      return null;
    }

    const s: Session = {
      id: data.id,
      userId: data.user_id ?? '',
      pairId: data.pair_id ?? 0,
      timeframe: (data.timeframe as Session['timeframe']) ?? 'M1',
      sessionName: data.session_name ?? undefined,
      sessionDate: data.session_date ?? '',
      dateIsHidden: data.date_is_hidden ?? true,
      startedAt: data.started_at ?? new Date().toISOString(),
      status: (data.status as Session['status']) ?? 'active',
    };
    setSession(s);
    return s;
  }, [userId]);

  const endSession = useCallback(async () => {
    if (!session) return;
    await supabase
      .from('sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', session.id);
    setSession(prev => prev ? { ...prev, status: 'completed' } : null);
  }, [session]);

  return { session, loading, error, startSession, endSession };
}
