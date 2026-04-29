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

const DAY_MS = 86_400_000;
const CYCLE_DAYS = 21;

/**
 * Auto-progression — week is derived from paid_at via a 21-day modulo loop.
 *   Days 0–6  → week 1 (60 min)
 *   Days 7–13 → week 2 (30 min)
 *   Days 14–20 → week 3 (15 min)
 *   Day 21+   → cycles back to week 1, indefinitely.
 *
 * Whether the loop continues past the first cycle is gated by the caller
 * via the `loop_enabled` profile column — this function just does the math.
 *
 * Keep in sync with src/utils/weekProgression.ts (mobile-side copy used by
 * the UI). Deno can't import the mobile module so the logic is duplicated;
 * boundary tests in __tests__/utils/weekProgression.test.ts pin the behavior.
 */
function deriveWeek(paidAt: string | null): 1 | 2 | 3 {
  if (!paidAt) return 1;
  const rawDays = (Date.now() - new Date(paidAt).getTime()) / DAY_MS;
  // Clock skew (paidAt in future) → treat as day 0, not "end of last cycle".
  const d = rawDays < 0 ? 0 : rawDays % CYCLE_DAYS;
  if (d < 7) return 1;
  if (d < 14) return 2;
  return 3;
}

/**
 * Local hour/minute in an IANA tz at the given moment.
 *
 * Keep in sync with src/utils/timezone.ts (mobile copy). Deno's
 * Intl.DateTimeFormat behaves identically — boundary tests in
 * __tests__/utils/timezone.test.ts pin the cross-DST behavior.
 */
function getLocalHourMinute(
  date: Date,
  timeZone: string,
): {hour: number; minute: number} {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const hourPart = parts.find(p => p.type === 'hour')?.value ?? '0';
  const minutePart = parts.find(p => p.type === 'minute')?.value ?? '0';
  const hour = parseInt(hourPart, 10) % 24;
  const minute = parseInt(minutePart, 10);
  return {hour, minute};
}

const MESSAGES = [
  'Pause for 10 seconds of open awareness.',
  'Eyes slightly up-right. Hold joyful anticipation.',
  'Breathe and open. 10 seconds is all it takes.',
  'A moment of stillness awaits you.',
];

const END_MESSAGES = [
  'Well done. Carry that stillness forward.',
  'Complete. Return to your day with clarity.',
  'That\'s it. You just reset your mind.',
  'Session complete. Back to greatness.',
];

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const utcMinutesOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();

    // Fetch all paid users who have a registered device
    const {data: profiles, error} = await supabase
      .from('profiles')
      .select(
        'user_id, onesignal_player_id, paid_at, awake_start, awake_end, utc_offset_minutes, time_zone, loop_enabled',
      )
      .eq('is_paid', true)
      .not('onesignal_player_id', 'is', null);

    if (error) throw error;

    const playerIds: string[] = [];

    for (const profile of profiles ?? []) {
      // User opted out of the indefinite loop after their first 21-day cycle.
      if (profile.loop_enabled === false) continue;

      // Convert UTC time to user's local time. Prefer the IANA tz
      // (DST-aware); fall back to the cached offset for legacy users
      // who haven't yet had time_zone populated.
      let localHour: number;
      let localMinutes: number;
      if (profile.time_zone) {
        try {
          const {hour, minute} = getLocalHourMinute(now, profile.time_zone);
          localHour = hour;
          localMinutes = hour * 60 + minute;
        } catch {
          localMinutes =
            (utcMinutesOfDay + profile.utc_offset_minutes + 1440) % 1440;
          localHour = Math.floor(localMinutes / 60);
        }
      } else {
        localMinutes =
          (utcMinutesOfDay + profile.utc_offset_minutes + 1440) % 1440;
        localHour = Math.floor(localMinutes / 60);
      }

      // Skip if outside awake window
      if (localHour < profile.awake_start || localHour >= profile.awake_end) {
        continue;
      }

      // Auto-progress through weeks based on time since payment.
      const week = deriveWeek(profile.paid_at);
      const intervalMinutes = INTERVAL_BY_WEEK[week] ?? 60;
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

    const notifPayload = (overrides: Record<string, unknown>) =>
      JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds,
        ios_sound: 'nil',
        android_sound: 'nil',
        ...overrides,
      });

    // First notification — start of meditation
    const onesignalRes = await fetch(
      'https://onesignal.com/api/v1/notifications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: notifPayload({
          headings: {en: 'Time to meditate'},
          contents: {en: message},
          data: {type: 'meditation_reminder'},
        }),
      },
    );

    const result = await onesignalRes.json();
    console.log('OneSignal result:', JSON.stringify(result));

    // Fire end-of-meditation notification in background ~20s after reminder
    // (≈10s perceived on device due to push delivery latency — do not change, calibrated value).
    // Not awaited so the HTTP response returns immediately before pg_net times out.
    const endMessage = END_MESSAGES[Math.floor(Math.random() * END_MESSAGES.length)];
    console.log('Scheduling end notification in 20s (≈10s perceived)...');
    const sendEndNotification = new Promise<void>(resolve => {
      setTimeout(async () => {
        console.log('Sending end notification now');
        await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
          },
          body: notifPayload({
            headings: {en: 'Meditation complete'},
            contents: {en: endMessage},
            data: {type: 'meditation_end'},
          }),
        });
        resolve();
      }, 20_000);
    });

    // Register background work so Deno keeps running after response is sent
    if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
      (globalThis as any).EdgeRuntime.waitUntil(sendEndNotification);
    }

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
