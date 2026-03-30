/**
 * useMeditation — drives the active session countdown and completion logic.
 * Updated to use Supabase instead of Firebase.
 */
import {useEffect, useRef} from 'react';
import {useAppDispatch, useAppSelector} from '@/store';
import {
  tick,
  completeMeditation,
  setOnenessReached,
} from '@/store/slices/meditationSlice';
import {logSession, upsertUserStats, getUserStats} from '@/services/supabase/database';
import {recordMeditationActivity} from '@/services/scheduler';
import {generateSessionId, POINT_VALUES} from '@/utils/meditation';
import {supabase} from '@/config/supabase';

export function useMeditation() {
  const dispatch = useAppDispatch();
  const {sessionState, remainingSeconds, currentWeek, stats} = useAppSelector(
    s => s.meditation,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sessionState === 'active') {
      intervalRef.current = setInterval(() => {
        dispatch(tick());
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionState, dispatch]);

  useEffect(() => {
    if (sessionState === 'active' && remainingSeconds === 0) {
      handleComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, sessionState]);

  async function handleComplete() {
    const now = Date.now();
    const session = {
      id: generateSessionId(),
      startedAt: now - 10_000,
      completedAt: now,
      durationSeconds: 10,
      week: currentWeek,
      skipped: false,
      pointsEarned: POINT_VALUES.completedSession,
    };

    dispatch(completeMeditation(session));
    recordMeditationActivity(true);

    const {data: sessionData} = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (uid) {
      try {
        await logSession(uid, session);

        const serverStats = await getUserStats(uid);
        const newTotal = (serverStats?.totalSessions ?? stats.totalSessions) + 1;

        if (newTotal >= 100 && !stats.onenessReached) {
          dispatch(setOnenessReached());
        }

        await upsertUserStats(uid, {
          totalSessions: newTotal,
          totalPoints: (serverStats?.totalPoints ?? stats.totalPoints) + POINT_VALUES.completedSession,
          streak: stats.streak,
        });
      } catch (err) {
        console.warn('[useMeditation] Supabase sync failed:', err);
      }
    }
  }
}
