import {supabase, TABLES} from '@/config/supabase';

export async function saveOneSignalId(uid: string, playerId: string) {
  const {error} = await supabase
    .from(TABLES.PROFILES)
    .upsert({
      user_id: uid,
      onesignal_player_id: playerId,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function syncUserSchedule(
  uid: string,
  week: 1 | 2 | 3,
  awakeStart: number,
  awakeEnd: number,
) {
  // JS getTimezoneOffset() returns minutes WEST of UTC — negate for standard UTC offset
  const utcOffsetMinutes = -(new Date().getTimezoneOffset());
  const {error} = await supabase
    .from(TABLES.PROFILES)
    .upsert({
      user_id: uid,
      current_week: week,
      awake_start: awakeStart,
      awake_end: awakeEnd,
      utc_offset_minutes: utcOffsetMinutes,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}
