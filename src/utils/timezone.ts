/**
 * Time-zone utilities. The Edge Function carries a duplicate of
 * getLocalHourMinute() because Deno can't import the mobile module —
 * keep the two copies in sync (boundary tests in
 * __tests__/utils/timezone.test.ts pin the behavior).
 */

/** Detect the device's current IANA tz, e.g. "America/Los_Angeles". */
export function getDeviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Return the local hour and minute in a given IANA tz at the moment
 * `date` represents. Returns hour in 0–23 and minute in 0–59.
 *
 * Throws if `timeZone` is not a valid IANA identifier.
 */
export function getLocalHourMinute(
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
  // hour12:false in 'en-US' can yield '24' for midnight in some engines;
  // normalize to 0–23.
  const hour = parseInt(hourPart, 10) % 24;
  const minute = parseInt(minutePart, 10);
  return {hour, minute};
}
