/**
 * useDatabase — loads user data from Supabase into Redux.
 * Replaces the old useFirestore hook.
 */
import {useCallback} from 'react';
import {useAppDispatch, useAppSelector} from '@/store';
import {setStats, setHistory, setHistoryLoading} from '@/store/slices/meditationSlice';
import {getUserStats, fetchSessionHistory} from '@/services/supabase/database';
import {supabase} from '@/config/supabase';

export function useDatabase() {
  const dispatch = useAppDispatch();
  const uid = useAppSelector(s => s.auth.user?.uid);

  const loadStats = useCallback(async () => {
    if (!uid) return;
    try {
      const stats = await getUserStats(uid);
      if (stats) dispatch(setStats(stats));
    } catch (err) {
      console.warn('[useDatabase] loadStats error:', err);
    }
  }, [uid, dispatch]);

  const loadHistory = useCallback(async () => {
    if (!uid) return;
    dispatch(setHistoryLoading(true));
    try {
      const history = await fetchSessionHistory(uid);
      dispatch(setHistory(history));
    } catch (err) {
      console.warn('[useDatabase] loadHistory error:', err);
      dispatch(setHistoryLoading(false));
    }
  }, [uid, dispatch]);

  return {loadStats, loadHistory};
}
