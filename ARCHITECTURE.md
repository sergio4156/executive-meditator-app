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
| `current_week` | smallint 1–3 | Which week of the program the user is on |
| `awake_start` | smallint 0–23 | Local hour reminders start |
| `awake_end` | smallint 0–23 | Local hour reminders stop |
| `utc_offset_minutes` | integer | User's timezone offset from UTC |
| `email` | text | Stored at payment time |
| `is_paid` | boolean | Set to true by Stripe webhook |
| `stripe_session_id` | text | Stripe checkout session ID |
| `paid_at` | timestamptz | Timestamp of successful payment |

Row-Level Security is enabled — users can only read/write their own row. The Edge Function bypasses RLS using the service role key.

### `corporate_inquiries` table
Populated by the `/api/contact` website route when a company submits the inquiry form. No RLS — server-side inserts only via service role key.

### Migrations
Run these in order if upgrading an existing schema:

```
supabase/schema.sql                     ← full schema (fresh installs)
supabase/migrations/001_add_schedule_fields.sql
supabase/migrations/002_add_payment_fields.sql
```

---

## Supabase Edge Function — `send-reminders`

**Trigger:** Supabase Cron, every 15 minutes.

**What it does:**
1. Fetches all `profiles` rows where `onesignal_player_id` is not null.
2. For each user, converts the current UTC time to their local time using `utc_offset_minutes`.
3. Skips users outside their `awake_start`/`awake_end` window.
4. Checks whether `localMinutes % intervalMinutes === 0`, where the interval is determined by `current_week` (week 1 = 60 min, week 2 = 30 min, week 3 = 15 min).
5. Sends a push notification to all due devices via OneSignal's REST API (silent tone, vibration only).
6. Schedules a second "meditation complete" notification 20 seconds later using `EdgeRuntime.waitUntil` so the HTTP response returns before Deno's timeout.

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

> Note: the website uses a different flow — `signInWithOtp` (magic link) — to onboard users via email before they download the app.

### Notification setup
On app launch, `App.tsx` calls `initializeNotifications()` (defined in `src/services/onesignal/notifications.ts`) which:
1. Sets the OneSignal app ID (`OneSignal.setAppId`) — the SDK is `react-native-onesignal` v4.5.1.
2. Triggers the OS notification permission prompt (`promptForPushNotificationsWithUserResponse`).
3. Reads the device's OneSignal player ID via `getDeviceState()` and saves it to Redux (`notificationSlice.fcmToken`).
4. If a Supabase session already exists at that moment, upserts the player ID into `profiles.onesignal_player_id`.

Because the player ID save in step 4 is gated on an active session, a fresh-install user (who launches the app *before* logging in) would otherwise never have their player ID saved. To close this race, `syncOneSignalIdForUser(uid)` is also called from the auth state change handler in `AppNavigator` whenever the session flips to logged-in.

From that point, the Edge Function drives all push scheduling — the app itself does not schedule local notifications.

### Meditation experience
The meditation experience is **passive** — when a push arrives, the user pauses for 10 seconds. The app does not run an in-session countdown timer.

`meditationSlice` tracks:
- `currentWeek` (1–3) — drives the reminder interval (60 min → 30 min → 15 min)
- `alarmLevel` (`none` | `subtle` | `mild` | `disease` | `critical`) — escalates if the user misses several consecutive sessions; reset to `none` when the user opens the app or taps a reminder

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
| `/setup` | Onboarding — email sign-up form |
| `/auth/callback` | Client-side page that exchanges the OTP code for a session via `supabase.auth.exchangeCodeForSession` |
| `/setup/confirmed` | Post-verification confirmation, redirects to Stripe |
| `/setup/success` | Post-payment success page with App Store / Google Play download links |
| `/privacy` | Privacy policy (required by Google Play Store) |

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

```
/setup form submit
  → supabase.auth.signInWithOtp({ email })   # sends magic link
  → user clicks email link
  → /auth/callback?code=...
  → supabase.auth.exchangeCodeForSession(code)
  → redirect to /setup/confirmed
  → redirect to Stripe checkout
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
