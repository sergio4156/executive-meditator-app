/**
 * Supabase database service
 *
 * All Firestore-style operations replaced with Supabase (PostgreSQL) equivalents.
 * Supabase uses a simple REST/PostgREST API — no gRPC, no native deps.
 */
import {supabase, TABLES} from '@/config/supabase';
import type {MeditationSession, MeditationStats} from '@/store/slices/meditationSlice';

// ---------- User stats ----------

export async function getUserStats(uid: string): Promise<MeditationStats | null> {
  const {data, error} = await supabase
    .from(TABLES.USER_STATS)
    .select('*')
    .eq('user_id', uid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // row not found
    throw error;
  }
  return {
    totalSessions: data.total_sessions,
    completedToday: data.completed_today,
    streak: data.streak,
    totalPoints: data.total_points,
    badges: data.badges ?? [],
    onenessReached: data.oneness_reached,
    weeklyCompletionRate: data.weekly_completion_rate,
  };
}

export async function upsertUserStats(uid: string, stats: Partial<MeditationStats>) {
  const row: Record<string, unknown> = {user_id: uid, updated_at: new Date().toISOString()};
  if (stats.totalSessions !== undefined) row.total_sessions = stats.totalSessions;
  if (stats.completedToday !== undefined) row.completed_today = stats.completedToday;
  if (stats.streak !== undefined) row.streak = stats.streak;
  if (stats.totalPoints !== undefined) row.total_points = stats.totalPoints;
  if (stats.badges !== undefined) row.badges = stats.badges;
  if (stats.onenessReached !== undefined) row.oneness_reached = stats.onenessReached;
  if (stats.weeklyCompletionRate !== undefined) row.weekly_completion_rate = stats.weeklyCompletionRate;
  const {error} = await supabase.from(TABLES.USER_STATS).upsert(row);
  if (error) throw error;
}

// ---------- Session logs ----------

export async function logSession(uid: string, session: MeditationSession) {
  const {error} = await supabase.from(TABLES.MEDITATION_LOGS).insert({
    id: session.id,
    user_id: uid,
    started_at: new Date(session.startedAt).toISOString(),
    completed_at: new Date(session.completedAt).toISOString(),
    duration_seconds: session.durationSeconds,
    week: session.week,
    skipped: session.skipped,
    points_earned: session.pointsEarned,
  });
  if (error) throw error;
}

export async function fetchSessionHistory(
  uid: string,
  limit = 50,
): Promise<MeditationSession[]> {
  const {data, error} = await supabase
    .from(TABLES.MEDITATION_LOGS)
    .select('*')
    .eq('user_id', uid)
    .order('started_at', {ascending: false})
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map(row => ({
    id: row.id,
    startedAt: new Date(row.started_at).getTime(),
    completedAt: new Date(row.completed_at).getTime(),
    durationSeconds: row.duration_seconds,
    week: row.week as 1 | 2 | 3,
    skipped: row.skipped,
    pointsEarned: row.points_earned,
  }));
}

// ---------- OneSignal player ID ----------

export async function saveOneSignalId(uid: string, playerId: string) {
  const {error} = await supabase
    .from(TABLES.PROFILES)
    .upsert({user_id: uid, onesignal_player_id: playerId, updated_at: new Date().toISOString()});
  if (error) throw error;
}
