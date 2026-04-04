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
