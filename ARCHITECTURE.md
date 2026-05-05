# Architecture — Executive Meditator

This monorepo contains two products that share a single Supabase backend:

| Directory | What it is |
|---|---|
| `/` (root) | React Native app (iOS + Android) |
| `website/` | Next.js marketing + onboarding site |
| `supabase/` | Database schema, migrations, Edge Functions |

---

## Services at a glance

| Service | Role | Auth method |
|---|---|---|
| **Supabase** | PostgreSQL database + user auth | anon key (client), service role key (server) |
| **OneSignal** | Push notifications to the mobile app | REST API key (Edge Function only) |
| **Stripe** | Executive-tier payment ($500) | Secret key (server-side only) |
| **Resend** | Transactional email (sign-up alerts, corporate inquiries) | API key (server-side only) |
| **Vercel** | Hosts the Next.js website | — |

---

## Database (Supabase)

### `profiles` table
One row per user. Created automatically via trigger when a user signs up.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid PK | References `auth.users` |
| `onesignal_player_id` | text | Device ID for push targeting |
| `current_week` | smallint 1–3 | Legacy column. Was the source of truth for cadence; now informational only. The Edge Function derives week live from `paid_at` via `deriveWeek()` (see migration `003_add_loop_enabled.sql` era). |
| `awake_start` | smallint 0–23 | Local hour reminders start |
| `awake_end` | smallint 0–23 | Local hour reminders stop |
| `utc_offset_minutes` | integer | Cached timezone offset from UTC. Used as fallback when `time_zone` is null. |
| `time_zone` | text | IANA tz identifier (e.g. `America/Los_Angeles`). Preferred over `utc_offset_minutes` for DST-aware scheduling. |
| `loop_enabled` | boolean default true | Whether the indefinite 21-day reminder loop continues past the first cycle. False = reminders paused. |
| `email` | text | Stored at payment time |
| `is_paid` | boolean | Set to true by Stripe webhook |
| `stripe_session_id` | text | Stripe checkout session ID |
| `paid_at` | timestamptz | Timestamp of successful payment. **Source of truth for the program week** — see `deriveWeek` in `src/utils/weekProgression.ts`. |

Row-Level Security is enabled — users can only read/write their own row. The Edge Function bypasses RLS using the service role key.

### `corporate_inquiries` table
Populated by the `/api/contact` website route when a company submits the inquiry form. No RLS — server-side inserts only via service role key.

### Migrations
Run these in order if upgrading an existing schema:

```
supabase/schema.sql                     ← full schema (fresh installs)
supabase/migrations/001_add_schedule_fields.sql
supabase/migrations/002_add_payment_fields.sql
supabase/migrations/003_add_loop_enabled.sql
supabase/migrations/004_add_time_zone.sql
```

---

## Supabase Edge Function — `send-reminders`

**Trigger:** Supabase Cron, every 15 minutes.

**What it does:**
1. Fetches all paid `profiles` rows where `onesignal_player_id` is not null. Includes `paid_at`, `loop_enabled`, `time_zone`, and `utc_offset_minutes`.
2. Skips users with `loop_enabled = false` (opted out of the indefinite loop).
3. Converts the current UTC time to each user's local time using `time_zone` via `Intl.DateTimeFormat` (DST-aware). Falls back to the cached `utc_offset_minutes` if `time_zone` is null.
4. Skips users outside their `awake_start`/`awake_end` window.
5. Derives the user's program week from `paid_at` via a 21-day modulo loop: days 0–6 = week 1 (60-min interval), 7–13 = week 2 (30-min), 14–20 = week 3 (15-min), then wraps. Source of truth for the cadence.
6. Checks whether `localMinutes % intervalMinutes === 0`. Sends a push to all due devices via OneSignal's REST API (silent tone, vibration only).
7. Schedules a second "meditation complete" notification 20 seconds later using `EdgeRuntime.waitUntil` so the HTTP response returns before Deno's timeout.

**Required secrets** (set in Supabase Dashboard → Settings → Edge Functions):

```
ONESIGNAL_APP_ID
ONESIGNAL_REST_API_KEY
SUPABASE_URL            (auto-injected)
SUPABASE_SERVICE_ROLE_KEY
```

---

## Mobile App (React Native)

### Auth flow
1. User signs in via `AuthScreen` → calls `supabase.auth.signInWithPassword(email, password)` (or `signUp` for new accounts). Anonymous sign-in (`signInAnonymously`) is also supported but not currently used by any screen.
2. The auth state listener in `AppNavigator` (subscribed via `supabase.auth.onAuthStateChange`) dispatches to `authSlice` and triggers `syncOneSignalIdForUser(uid)` to associate the device's OneSignal player ID with the logged-in user.
3. On first sign-in, the `handle_new_user` database trigger creates a `profiles` row automatically.

> Note: the website uses a different signup path — `supabase.auth.signUp({ email, password })` with an email-confirmation link — to onboard users before they download the app. Mobile and website both ultimately produce the same Supabase auth user; the app uses email+password sign-in to access it.

### Notification setup
OneSignal initializes in two stages — native first, then JS — to avoid a first-launch race on Android:

1. **Native** (`MainApplication.onCreate` in `android/app/src/main/java/com/executivemeditator/MainApplication.kt`): calls `OneSignal.initWithContext(this)` immediately at Application startup so `OneSignal.appContext` is populated before any JS runs. Without this, `NotificationPermissionController`'s static initializer NPEs on fresh Play Store installs (Play Protect overhead delays setAppId past the prompt). See [feedback_onesignal_native_init.md](memory/feedback_onesignal_native_init.md).
2. **JS** (`App.tsx` calls `initializeNotifications()` from `src/services/onesignal/notifications.ts`):
   - Sets the OneSignal app ID (`OneSignal.setAppId`) — the SDK is `react-native-onesignal` v4.5.1.
   - Triggers the OS notification permission prompt (`promptForPushNotificationsWithUserResponse`).
   - Reads the device's OneSignal player ID via `getDeviceState()` and saves it to Redux (`notificationSlice.fcmToken`).
   - If a Supabase session already exists at that moment, upserts the player ID into `profiles.onesignal_player_id`.

Because the player ID save in step 4 is gated on an active session, a fresh-install user (who launches the app *before* logging in) would otherwise never have their player ID saved. To close this race, `syncOneSignalIdForUser(uid)` is also called from the auth state change handler in `AppNavigator` whenever the session flips to logged-in.

From that point, the Edge Function drives all push scheduling — the app itself does not schedule local notifications.

### Meditation experience
The meditation experience is **passive** — when a push arrives, the user pauses for 10 seconds. The app does not run an in-session countdown timer.

`meditationSlice` tracks:
- `currentWeek` (1–3) — derived live from `paid_at` via `deriveWeek()` ([src/utils/weekProgression.ts](src/utils/weekProgression.ts)) and dispatched on auth events. Drives the in-app UI ("Week 2 of 3"); the Edge Function recomputes it independently for cadence decisions.
- `alarmLevel` (`none` | `subtle` | `mild` | `disease` | `critical`) — escalates if the user misses several consecutive sessions; reset to `none` when the user opens the app or taps a reminder

The program loops indefinitely in 21-day cycles (week 1 → 2 → 3 → 1 → …). After the first cycle completes (`isFirstCycleComplete(paidAt)` returns true at day 21+), the Settings screen renders a toggle that lets the user stop or resume the loop by writing to `profiles.loop_enabled`.

Timezone is auto-synced. `getDeviceTimeZone()` (in [src/utils/timezone.ts](src/utils/timezone.ts)) is called on sign-in and on every `AppState 'active'` event; if the device's IANA tz no longer matches the DB, `syncTimeZoneIfChanged(uid)` updates the row. This handles travelers and silent DST transitions without requiring manual Settings changes.

A foreground heartbeat (`startScheduler` in `src/services/scheduler.ts`) is defined to drive alarm-level escalation, but is currently not wired into app lifecycle. Push delivery itself is unaffected — it is fully driven by the `send-reminders` Edge Function.

### Redux slices

| Slice | State |
|---|---|
| `authSlice` | `user`, `loading`, `error`, `isPaid`, `isPaidLoading` |
| `meditationSlice` | `currentWeek`, `alarmLevel` |
| `notificationSlice` | `fcmPermissionGranted`, `fcmToken`, `notifications`, `unreadCount`, `onboardingComplete`, `awakeStart`, `awakeEnd` |

---

## Website (Next.js)

Deployed to Vercel. All API routes run as serverless functions.

### Pages

| Route | Description |
|---|---|
| `/` | Marketing landing page (one-page scroll) |
| `/setup` | Onboarding — email + password sign-up form |
| `/auth/callback` | Client-side page that waits for Supabase to auto-process the implicit-flow URL fragment, then redirects to `/setup/confirmed` (or back to `/setup` with an error param) |
| `/auth/reset-password` | Password reset flow (handles both PKCE and implicit token formats) |
| `/setup/confirmed` | Post-verification confirmation, redirects to Stripe |
| `/setup/success` | Post-payment success page with App Store / Google Play download links |
| `/privacy` | Privacy policy (required by Google Play Store) |
| `/terms` | Terms of service |
| `/delete-account` | Public account-deletion instructions page (required by Google Play since 2024) |

### API routes

#### `POST /api/stripe/checkout`
Creates a Stripe Checkout session for the Executive tier ($500).
- Reads `STRIPE_SECRET_KEY`. If not set, returns `{ url: '/setup' }` (graceful no-op for dev).
- On success, returns `{ url: <stripe_checkout_url> }`. The client redirects to it.
- Stripe sends a webhook to `/api/stripe/webhook` on payment completion, which sets `profiles.is_paid = true`.

#### `POST /api/notify-signup`
Called by the `/setup` page immediately after a user submits the sign-up form (before email verification). Sends an internal alert email via Resend so you know someone new signed up. Gracefully no-ops if `RESEND_API_KEY` is not configured.

#### `POST /api/contact`
Called by the corporate inquiry form (`#corporate` section).
1. Validates required fields.
2. Inserts a row into `corporate_inquiries` via Supabase service role key.
3. Sends a notification email via Resend with the inquiry details (reply-to set to the submitter).

### Auth flow (website)

The website client uses Supabase's **implicit** flow type (configured in `website/src/lib/supabase.ts` via `flowType: 'implicit'`) so verification links work cross-browser. PKCE was tried first and rejected because non-technical users routinely click email links from a different browser context (e.g., Gmail's in-app browser) than the one where they signed up — PKCE's localStorage code_verifier requirement is fatal in that scenario.

```
/setup form submit
  → supabase.auth.signUp({ email, password, options: { emailRedirectTo: ... } })
  → Supabase sends confirmation email with /auth/v1/verify?token=...
  → user clicks email link
  → Supabase verifies the token server-side and redirects to:
    /auth/callback?next=/setup/confirmed#access_token=...&refresh_token=...
  → supabase client (with detectSessionInUrl: true, default) auto-processes the fragment
  → callback page listens for INITIAL_SESSION via onAuthStateChange
  → redirect to /setup/confirmed (the `next` query param)
  → redirect to Stripe checkout (with allow_promotion_codes: true)
  → Stripe webhook → profiles.is_paid = true
  → redirect to /setup/success
```

---

## Environment variables

### Mobile app (`.env`)

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon/public key |
| `ONESIGNAL_APP_ID` | OneSignal Dashboard → Settings → Keys & IDs |

### Website (`website/.env.local`)

| Variable | Used by | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase → Settings → API |
| `STRIPE_SECRET_KEY` | `/api/stripe/checkout` | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client (future use) | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` | Stripe Dashboard → Webhooks → signing secret |
| `RESEND_API_KEY` | `/api/notify-signup`, `/api/contact` | Resend Dashboard → API Keys |
| `NOTIFICATION_EMAIL` | `/api/notify-signup`, `/api/contact` | Your email (comma-separated for multiple) |
| `NEXT_PUBLIC_SITE_URL` | Stripe redirect URLs | Your production URL, e.g. `https://executivemeditator.com` |
| `NEXT_PUBLIC_GOOGLE_PLAY_URL` | `/setup/success` download button | Google Play Store listing URL (add once app is live) |
| `NEXT_PUBLIC_APP_STORE_URL` | `/setup/success` download button | Apple App Store listing URL (add once app is live) |

---

## Data flow diagram

```
User (mobile app)
  │
  ├─ auth ──────────────────────────► Supabase Auth
  │                                         │
  ├─ profile upsert ────────────────► profiles table
  │   (onesignal_player_id,                 │
  │    current_week, schedule)              │
  │                                   Supabase Cron (every 15 min)
  │                                         │
  │                              send-reminders Edge Function
  │                                         │
  │                                    OneSignal REST API
  │                                         │
  └─────────────── push notification ◄──────┘


User (website)
  │
  ├─ /setup form ───────────────────► Supabase Auth (OTP email)
  │                                   /api/notify-signup → Resend (internal alert)
  │
  ├─ /auth/callback ────────────────► Supabase Auth (exchange code)
  │
  ├─ /setup/confirmed ──────────────► /api/stripe/checkout → Stripe
  │
  ├─ Stripe webhook ────────────────► profiles.is_paid = true
  │
  └─ #corporate form ───────────────► /api/contact
                                          ├─ corporate_inquiries table (Supabase)
                                          └─ Resend (email notification)
```
