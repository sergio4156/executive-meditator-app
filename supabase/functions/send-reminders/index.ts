/**
 * send-reminders — Supabase Edge Function
 *
 * Runs every 15 minutes via Supabase Cron.
 * For each registered user it checks:
 *   1. Is it within their awake window (local time)?
 *   2. Is it time for a reminder based on their program week interval?
 * If yes → fires a silent (vibration-only) push via OneSignal.
 *
 * Required Supabase secrets (set via Supabase Dashboard → Settings → Edge Functions):
 *   ONESIGNAL_APP_ID
 *   ONESIGNAL_REST_API_KEY   (OneSignal dashboard → Settings → Keys & IDs)
 */
import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const INTERVAL_BY_WEEK: Record<number, number> = {
  1: 60,
  2: 30,
  3: 15,
};

const MESSAGES = [
  'Pause for 10 seconds of open awareness.',
  'Eyes slightly up-right. Hold joyful anticipation.',
  'Breathe and open. 10 seconds is all it takes.',
  'A moment of stillness awaits you.',
];

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const utcMinutesOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();

    // Fetch all users who have a registered device
    const {data: profiles, error} = await supabase
      .from('profiles')
      .select(
        'user_id, onesignal_player_id, current_week, awake_start, awake_end, utc_offset_minutes',
      )
      .not('onesignal_player_id', 'is', null);

    if (error) throw error;

    const playerIds: string[] = [];

    for (const profile of profiles ?? []) {
      // Convert UTC time to user's local time
      const localMinutes =
        (utcMinutesOfDay + profile.utc_offset_minutes + 1440) % 1440;
      const localHour = Math.floor(localMinutes / 60);

      // Skip if outside awake window
      if (localHour < profile.awake_start || localHour >= profile.awake_end) {
        continue;
      }

      // Check if it's on the interval (within a 1-minute tolerance)
      const intervalMinutes = INTERVAL_BY_WEEK[profile.current_week] ?? 60;
      if (localMinutes % intervalMinutes !== 0) continue;

      playerIds.push(profile.onesignal_player_id);
    }

    if (playerIds.length === 0) {
      return new Response(JSON.stringify({sent: 0, message: 'No users due'}), {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      });
    }

    // Pick a random message for variety
    const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

    // Send via OneSignal REST API — vibration only, no sound
    const onesignalRes = await fetch(
      'https://onesignal.com/api/v1/notifications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_player_ids: playerIds,
          headings: {en: 'Time to meditate'},
          contents: {en: message},
          // Vibration only — no sound
          ios_sound: 'nil',
          android_sound: 'nil',
          // Route through the silent vibration-only channel created in MainApplication.kt
          android_channel_id: 'meditation_reminders',
          // Additional data for in-app handling
          data: {type: 'meditation_reminder'},
        }),
      },
    );

    const result = await onesignalRes.json();

    return new Response(
      JSON.stringify({sent: playerIds.length, onesignal: result}),
      {status: 200, headers: {'Content-Type': 'application/json'}},
    );
  } catch (err) {
    return new Response(JSON.stringify({error: String(err)}), {
      status: 500,
      headers: {'Content-Type': 'application/json'},
    });
  }
});
