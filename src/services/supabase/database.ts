import {supabase, TABLES} from '@/config/supabase';
import {getDeviceTimeZone} from '@/utils/timezone';

export async function saveOneSignalId(uid: string, playerId: string) {
  const {error} = await supabase
    .from(TABLES.PROFILES)
    .upsert({
      user_id: uid,
      onesignal_player_id: playerId,
      updated_at: new Date().toISOString(),
    });
  if (error) {throw error;}
}

/**
 * Whether a subscription is currently active.
 *
 * Access is `access_expires_at > now()`, NOT `is_paid`. Since the move to a
 * recurring subscription, is_paid only means "has ever paid" — a lapsed
 * subscriber still has it set, so relying on it would hand free access to
 * everyone who cancelled.
 *
 * A null expiry means no access: rows predating the subscription model were
 * backfilled to 2099 by migration 005, so null now only occurs on profiles
 * that never had access at all.
 */
export function hasActiveAccess(accessExpiresAt: string | null): boolean {
  if (!accessExpiresAt) {return false;}
  const expiry = new Date(accessExpiresAt).getTime();
  // An unparseable date must not grant access — fail closed.
  if (!Number.isFinite(expiry)) {return false;}
  return expiry > Date.now();
}

export async function fetchPaymentStatus(uid: string): Promise<{
  isPaid: boolean;
  paidAt: string | null;
  accessExpiresAt: string | null;
  loopEnabled: boolean;
}> {
  const {data, error} = await supabase
    .from(TABLES.PROFILES)
    .select('is_paid, paid_at, access_expires_at, loop_enabled')
    .eq('user_id', uid)
    .single();
  if (error) {throw error;}

  const accessExpiresAt = data?.access_expires_at ?? null;
  return {
    // `isPaid` now answers "may this user in the app right now", which is what
    // every caller actually wanted. The name is kept so the paywall routing in
    // AppNavigator and the cached AsyncStorage key do not have to change.
    isPaid: hasActiveAccess(accessExpiresAt),
    // First purchase — anchors the program week. Unchanged by renewals.
    paidAt: data?.paid_at ?? null,
    accessExpiresAt,
    loopEnabled: data?.loop_enabled !== false,
  };
}

export async function updateLoopEnabled(uid: string, enabled: boolean) {
  const {error} = await supabase
    .from(TABLES.PROFILES)
    .update({loop_enabled: enabled, updated_at: new Date().toISOString()})
    .eq('user_id', uid);
  if (error) {throw error;}
}

/** @deprecated use fetchPaymentStatus instead */
export async function fetchIsPaid(uid: string): Promise<boolean> {
  const {isPaid} = await fetchPaymentStatus(uid);
  return isPaid;
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
      time_zone: getDeviceTimeZone(),
      updated_at: new Date().toISOString(),
    });
  if (error) {throw error;}
}

/**
 * Lightweight tz refresh — only updates time_zone (and the cached offset)
 * when the device's current tz no longer matches what we have in the DB.
 * Called on app foreground so a traveling user's reminders re-align to
 * the new local time without waiting for them to touch Settings.
 */
export async function syncTimeZoneIfChanged(uid: string) {
  const deviceTz = getDeviceTimeZone();
  const {data, error: fetchErr} = await supabase
    .from(TABLES.PROFILES)
    .select('time_zone')
    .eq('user_id', uid)
    .single();
  if (fetchErr) {throw fetchErr;}
  if (data?.time_zone === deviceTz) {return;}

  const utcOffsetMinutes = -(new Date().getTimezoneOffset());
  const {error} = await supabase
    .from(TABLES.PROFILES)
    .update({
      time_zone: deviceTz,
      utc_offset_minutes: utcOffsetMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', uid);
  if (error) {throw error;}
}
