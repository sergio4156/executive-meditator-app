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
| **Stripe** | Web subscription — $19.99 every 3 months, auto-renewing | Secret key (server-side only) |
| **Apple In-App Purchase** | iOS subscription — same price and term, sold through the App Store | In-App Purchase `.p8` key (Edge Functions only) |
| **Resend** | Transactional email (sign-up alerts, corporate inquiries) | API key (server-side only) |
| **Vercel** | Hosts the Next.js website | — |
| **Sentry** | Website error monitoring (server + edge + browser) | DSN (env-gated; `@sentry/nextjs`) |
| **Firebase Crashlytics** | Mobile crash + JS-error reporting (Android) | `google-services.json` (`@react-native-firebase/crashlytics`) |
| **Firebase Analytics** | Mobile product analytics — activation, week progression, churn | `google-services.json` (`@react-native-firebase/analytics`) |
| **GA4 Measurement Protocol** | Server-side `purchase_completed` from the Stripe webhook | `GA4_MEASUREMENT_ID` + `GA4_API_SECRET` (server-side only) |

---

## Database (Supabase)

### `profiles` table
One row per user. Created automatically via trigger when a user signs up.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid PK | References `auth.users` |
| `onesignal_player_id` | text | Device ID for push targeting |
| `current_week` | smallint 1–3 | Legacy column, now informational only. The program week is derived live from `paid_at` via `deriveWeek()` in [src/utils/weekProgression.ts](src/utils/weekProgression.ts); the Edge Function recomputes it independently for cadence. |
| `awake_start` | smallint 0–23 | Local hour reminders start |
| `awake_end` | smallint 0–23 | Local hour reminders stop |
| `utc_offset_minutes` | integer | Cached timezone offset from UTC. Used as fallback when `time_zone` is null. |
| `time_zone` | text | IANA tz identifier (e.g. `America/Los_Angeles`). Preferred over `utc_offset_minutes` for DST-aware scheduling. |
| `loop_enabled` | boolean default true | Whether the indefinite 21-day reminder loop continues past the first cycle. False = reminders paused. |
| `email` | text | Stored at payment time |
| `is_paid` | boolean | "Has ever paid." **Not** an entitlement check — it stays true after a subscription lapses. Kept for reporting and as a cheap pre-filter. |
| `access_expires_at` | timestamptz | **Source of truth for access.** A user may enter the app while `access_expires_at > now()`. Null means no access. |
| `subscription_provider` | text | `stripe` or `apple` — which side owns the renewal, and therefore which webhook maintains the expiry. |
| `subscription_id` | text | Stripe subscription id, or Apple's `originalTransactionId`. The only link from an inbound renewal event back to a user, since neither carries an email. Indexed. |
| `stripe_session_id` | text | Stripe checkout session ID. Also the idempotency key for `checkout.session.completed`. |
| `paid_at` | timestamptz | Timestamp of the **first** payment. **Source of truth for the program week** — see `deriveWeek` in `src/utils/weekProgression.ts`. Never rewritten on renewal or restore: doing so would snap an established user back to Week 1. |

Row-Level Security is enabled — users can only read/write their own row. The Edge Function bypasses RLS using the service role key.

### `corporate_inquiries` table
Populated by the `/api/contact` website route when a company submits the inquiry form. No RLS — server-side inserts only via service role key.

### Migrations
Run these in order if upgrading an existing schema:

```
supabase/schema.sql                     ← full schema (fresh installs)
supabase/migrations/001_add_schedule_fields.sql   ← also DROPs legacy meditation_logs + user_stats
supabase/migrations/002_add_payment_fields.sql
supabase/migrations/003_add_loop_enabled.sql
supabase/migrations/004_add_time_zone.sql
supabase/migrations/005_add_subscription_access.sql  ← access_expires_at + subscription fields
website/supabase/migrations.sql          ← defines corporate_inquiries (website contact form)
```

**Migration 005 backfills existing paid users to an expiry of 2099-12-31.** They bought
lifetime access under the previous model and must keep it. This also covers the App Review
test account — expiring it would put the reviewer behind the paywall.

---

## Supabase Edge Function — `send-reminders`

**Trigger:** Supabase Cron, every 15 minutes.

**What it does:**
1. Fetches all paid `profiles` rows where `onesignal_player_id` is not null. Includes `paid_at`, `loop_enabled`, `time_zone`, and `utc_offset_minutes`.
2. Skips users with `loop_enabled = false` (opted out of the indefinite loop).
3. Converts the current UTC time to each user's local time using `time_zone` via `Intl.DateTimeFormat` (DST-aware). Falls back to the cached `utc_offset_minutes` if `time_zone` is null.
4. Skips users outside their `awake_start`/`awake_end` window.
5. Derives the user's program week from `paid_at` via a 21-day modulo loop: days 0–6 = week 1 (60-min interval), 7–13 = week 2 (30-min), 14–20 = week 3 (15-min), then wraps. Source of truth for the cadence.
6. Checks whether the user is due using a **window** test — `localMinutes % intervalMinutes < 15` (the run cadence), not exact `=== 0`. This is deliberate: exact equality silently skipped users in half-hour / quarter-hour timezones (India UTC+5:30, Nepal +5:45) and any cron-minute drift. Sends a push to all due devices via OneSignal's REST API (silent tone, vibration only), wrapped in try/catch so a transient OneSignal failure doesn't drop the whole cohort; stale `invalid_player_ids` are pruned best-effort.
7. Schedules a second "meditation complete" notification 20 seconds later (calibrated value — do not change) via `EdgeRuntime.waitUntil` so the HTTP response returns before Deno's timeout; falls back to `await` when EdgeRuntime is unavailable so the delayed send isn't lost.

**Required secrets** (set in Supabase Dashboard → Settings → Edge Functions):

```
ONESIGNAL_APP_ID
ONESIGNAL_REST_API_KEY
SUPABASE_URL            (auto-injected)
SUPABASE_SERVICE_ROLE_KEY
```

Step 1 also filters on `access_expires_at > now()`. Without it, a cancelled subscriber
would keep receiving reminders for as long as the loop ran.

---

## Supabase Edge Functions — Apple In-App Purchase

Two functions plus a shared client, all in [supabase/functions/](supabase/functions/). Between
them they are the only writers of `access_expires_at` for Apple subscribers.

### `_shared/appstore.ts`

Signs an ES256 JWT with the In-App Purchase key and calls the **App Store Server API**
(`GET /inApps/v1/subscriptions/{transactionId}`). Tries production, falls back to sandbox —
Apple runs the two environments with no cross-visibility, and TestFlight and App Review both
transact in sandbox, so the fallback is what makes review work against the deployed function
without a config flag.

> ### ⚠️ Production returns **401**, not 404, for an unreleased app
> Measured against Apple on 2026-08-29 with a fake transaction id and a valid key, in the same
> second:
>
> ```
> production -> HTTP 401, empty body
> sandbox    -> HTTP 404 {"errorCode":4040010,"errorMessage":"Transaction id not found."}
> ```
>
> The credentials were fine. Apple's production endpoint rejects apps that have no production
> presence yet, which is every app before its first release.
>
> **So the sandbox fallback must trigger on 401 as well as 404.** Treating a production 401 as
> fatal breaks the single most important case: an App Review purchase happens in sandbox, so
> verification would fail and the build would be rejected for the very feature it was submitted
> to add. Only a 401 from **both** environments means the credentials are actually wrong.
>
> Verify the whole chain without a device by POSTing a fabricated notification to the deployed
> webhook — a made-up `originalTransactionId` inside an unsigned JWS is enough, because the
> function ignores the payload and asks Apple. `{"status":"unrecognised"}` with HTTP 200 means
> signing, key, issuer, bundle id, and fallback all work. HTTP 500 means they do not.

`accessExpiryFor()` turns Apple's status into an expiry. Billing-retry and grace-period
both **keep** access (Apple is still trying to collect; cutting off a customer over one
declined card is worse than the few days it saves). A revocation always wins over an active
status and a future expiry — otherwise every refund becomes a free subscription. Unknown
statuses fail closed. Pinned by [`__tests__/services/appleAccess.test.ts`](__tests__/services/appleAccess.test.ts).

### `verify-apple-purchase`

Called by the app after a purchase or a Restore. Takes `{transactionId}`, asks Apple, writes
`access_expires_at`.

- The **user id comes from the verified JWT**, never the request body — otherwise anyone could
  credit anyone else's account with their own transaction.
- Rejects a transaction already bound to a *different* account (409). One Apple subscription
  unlocks one account; without this, a single purchase could be replayed via Restore across
  unlimited accounts by signing in and out.
- Returns 5xx rather than a rejection when Apple or the database is unreachable, so the client
  leaves the StoreKit transaction **unfinished** and retries on the next launch. Finishing an
  unverified transaction would silently discard a purchase the user paid for.

### `apple-notifications`

App Store Server Notifications V2 — Apple's renewal/cancellation/refund webhook, the
counterpart to the Stripe webhook. Without it an iOS subscriber renews and the app locks them
out anyway.

**Trust model:** the endpoint is public and unauthenticated (Apple has no credential of ours
to present), so the notification body is never treated as fact. The only thing taken from it is
an `originalTransactionId`, which is then used to ask Apple directly. A forged POST therefore
achieves nothing — either Apple does not recognise the id, or Apple tells us the truth. This is
why there is no JWS certificate-chain verification: chain validation would prove Apple sent the
payload, whereas asking Apple proves what is *actually true now*, and cannot be defeated by a
bug in hand-rolled X.509 parsing.

Deploy with **`--no-verify-jwt`**, or Supabase rejects Apple's requests before they arrive:

```
supabase functions deploy apple-notifications --no-verify-jwt
supabase functions deploy verify-apple-purchase
```

**Deployed 2026-08-29.** Confirm the flag stuck with `supabase functions list` — the
`apple-notifications` entry must show `"verify_jwt": false`. If a later redeploy omits the flag it
silently reverts to `true`, and every Apple notification is rejected before reaching the code, with
no error anywhere in the function logs.

Webhook URL to register in App Store Connect (both environments):

```
https://xhqmzryqwnbcdmwvfyev.supabase.co/functions/v1/apple-notifications
```

**Required secrets:**

```
APPLE_IAP_KEY_ID          App Store Connect → Users and Access → Integrations → In-App Purchase
APPLE_IAP_ISSUER_ID       same page
APPLE_IAP_PRIVATE_KEY     full .p8 contents, BEGIN/END lines included
APPLE_BUNDLE_ID           com.executivemeditator.app
```

> The In-App Purchase key is **not** the App Store Connect API key used to upload builds. It is
> generated separately and the upload key will not authenticate here.

**App Store Connect setup** (console-only, cannot be scripted):
1. Subscriptions → create a group → create a subscription: product ID
   `com.executivemeditator.access.3month`, duration **3 months**, price **$19.99**. The product
   ID must match `IOS_SUBSCRIPTION_SKU` in [src/services/iap/index.ts](src/services/iap/index.ts)
   exactly — a mismatch does not error, `getSubscriptions` just returns nothing and the paywall
   shows the fallback price.
2. Add localization (display name + description) and a review screenshot. Apple rejects
   subscriptions without one.
3. App Information → App Store Server Notifications → set **both** the Production and Sandbox
   URLs to the deployed `apple-notifications` function. An unset sandbox URL means the entire
   renewal path goes untested until real customers hit it.

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

### Payment gating (paywall)

Access is gated on **`profiles.access_expires_at > now()`**, evaluated by `hasActiveAccess()` in [src/services/supabase/database.ts](src/services/supabase/database.ts). It is *not* gated on `is_paid`, which since the move to subscriptions only means "has ever paid" and stays true for cancelled users. `AppNavigator` routes anyone without active access to `PaywallScreen`.

`AppNavigator` caches the **expiry timestamp**, not a boolean (`accessExpiresAt:<uid>` in AsyncStorage). A cached "yes" would readmit a lapsed subscriber on every cold start, and indefinitely while offline; caching the timestamp lets the same expiry check run locally, so access ends on time without a network call.

**The paywall is two different screens.** See [src/screens/PaywallScreen.tsx](src/screens/PaywallScreen.tsx).

- **iOS sells.** Apple's Guideline 3.1.1 requires that content unlocked in-app be purchasable via In-App Purchase; selling only on the website is why build 1 was rejected. The screen carries everything Guideline 3.1.2 requires — title, duration, price (read from StoreKit, *not* hardcoded, since Apple sets a different local price per storefront), the auto-renewal disclosure, Restore Purchases, and links to Terms and Privacy.
- **Android does not sell.** Play Billing is not implemented, and Play's Payments policy forbids linking out to an external purchase, so Android keeps the neutral "access required + contact support" message. Everything in `src/services/iap` no-ops when `Platform.OS !== 'ios'`.

**The client never decides entitlement.** A purchase ends with the transaction id being sent to the `verify-apple-purchase` Edge Function, which asks Apple and writes `access_expires_at`. A patched binary can fake a StoreKit response; it cannot fake Apple's answer to our server.

### Crash reporting

Firebase Crashlytics (`@react-native-firebase/app` + `/crashlytics`) auto-captures native crashes and unhandled JS errors, and uploads the R8/proguard mapping so Play Console crash reports are deobfuscated. Firebase auto-initializes from `google-services.json` (no JS init). It only adds `/app` + `/crashlytics` — not `/messaging` — so it coexists with OneSignal, which still owns push. Free on the Firebase Spark plan. On iOS, Firebase initializes from `GoogleService-Info.plist` (at `ios/ExecutiveMeditator/`) via `[FIRApp configure]` in `AppDelegate.mm`.

### Product analytics

Firebase Analytics (`@react-native-firebase/analytics`), wrapped by [src/services/analytics.ts](src/services/analytics.ts). Added 2026-08-13, deliberately **before** launch — retention cannot be collected retroactively.

**Retention is NOT app opens.** This product is passive by design: Home says "no action needed here", and a user following the program correctly may never reopen the app. App-open/DAU retention therefore understates it badly and must not be reported as retention. True retention — "still enrolled and still receiving reminders" — is a server-side fact derivable from `profiles.paid_at` + schedule rows, so it is deliberately **not** an event. For the same reason there is no cycle-completion event: it is a pure function of `paid_at >= 21 days` and is queryable for the whole user base at once, including users a client event would never see.

Events (closed TypeScript union — a typo is a type error, not a silently missing metric): `login_completed`, `onboarding_completed` (activation), `program_week_reached`, `reminder_opened`, `notifications_disabled`, `awake_window_changed`, `loop_setting_changed`, `account_deletion_requested`.

Two guards exist because both fail *silently* rather than loudly (covered by `__tests__/services/analytics.test.ts`):

- `program_week_reached` de-dupes per user per week. The week is derived from `paid_at` on every launch, so without the guard the funnel would inflate by however often each user happens to open the app. It keys on a week **change**, not a high-water mark, because the program loops 3 → 1.
- `notifications_disabled` fires only on the granted → off transition. A user who never opted in has not churned; they never activated.

No PII in event properties — the Supabase user ID is the analytics identifier, never the email.

**⚠️ Android AD_ID trap — re-verify before every Play upload.** `play-services-measurement` declares **three** ad-related permissions under different names: `com.google.android.gms.permission.AD_ID`, `android.permission.ACCESS_ADSERVICES_AD_ID`, and `android.permission.ACCESS_ADSERVICES_ATTRIBUTION`. Our Play Data Safety filing declares **"Advertising ID: No"**, so letting any of them merge in makes that filing false. All three are stripped with `tools:node="remove"` in [android/app/src/main/AndroidManifest.xml](android/app/src/main/AndroidManifest.xml), plus `google_analytics_adid_collection_enabled=false` in `strings.xml`. Verify with:

```bash
grep -E "AD_ID|ADSERVICES" android/app/build/intermediates/merged_manifest/release/AndroidManifest.xml
```

It must return nothing. Removing only the GMS permission is **not** sufficient.

**Website:** no browser analytics tag is installed, deliberately — that would mean cookies and a consent-banner obligation across the 175 listed countries. `purchase_completed` is sent server-side from the Stripe webhook via the GA4 Measurement Protocol ([website/src/lib/analytics.ts](website/src/lib/analytics.ts)), after the idempotency guard, so a Stripe retry cannot double-count revenue. It no-ops when `GA4_MEASUREMENT_ID`/`GA4_API_SECRET` are unset and can never throw — a measurement failure must not fail a payment.

### Redux slices

| Slice | State |
|---|---|
| `authSlice` | `user`, `loading`, `error`, `isPaid`, `isPaidLoading`, `paidAt`, `loopEnabled` |
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
| `/sitemap.xml` | Generated from `src/app/sitemap.ts` — lists indexable pages |
| `/robots.txt` | Generated from `src/app/robots.ts` — allows crawl, references the sitemap |

**SEO:** the four content pages (`/`, `/privacy`, `/terms`, `/delete-account`) set a self-referencing canonical to `https://www.theexecutivemeditator.com` via `metadataBase` + `alternates.canonical`, and are the only URLs in the sitemap. The apex domain 307-redirects to `www` (the canonical origin).

Two transactional route groups are `noindex`, each via a layout:

| Group | Layout | Why |
|---|---|---|
| `/setup`, `/setup/confirmed`, `/setup/success` | `src/app/setup/layout.tsx` | Signup funnel; avoids "Duplicate without canonical" and "Page with redirect" reports |
| `/auth/callback`, `/auth/reset-password` | `src/app/auth/layout.tsx` | Transient handlers — one consumes a single-use code, the other is reached from an emailed link. An indexed reset-password page is a confusing search result. |

⚠️ **Do NOT also `Disallow` these paths in `robots.ts`.** Crawling must stay allowed so Googlebot can actually read the `noindex` directive — blocking the crawl is the classic mistake that leaves pages indexed forever.

### API routes

#### `POST /api/stripe/checkout`
Creates a Stripe Checkout session in **`mode: 'subscription'`** — $19.99 (`unit_amount: 1999`) recurring on `interval: 'month'` with `interval_count: 3`. There is only one price; the corporate tier was removed 2026-08-29, and a `tier` param in the body is ignored entirely so no stale client can select a price we no longer offer.
- The 3-month interval matches the App Store subscription period. Apple offers only 1 week / 1 / 2 / 3 / 6 months / 1 year, so the intended "three 21-day cycles" (63 days) has no exact match: 2 months would cut users off mid-cycle, 3 months covers four full cycles. Stripe has no `quarter`, hence `month × 3`.
- `supabase_user_id` is written to **both** `metadata` and `subscription_data.metadata`. Checkout metadata does not propagate to the subscription, and renewals arrive against the subscription with no session and no email — without the second copy, a renewal three months later cannot be attributed to anyone.
- Reads `STRIPE_SECRET_KEY`. If not set, returns `{ url: '/setup' }` (graceful no-op for dev).

#### `POST /api/stripe/webhook`
Verifies the Stripe signature, then handles three events:
- **`checkout.session.completed`** — records `access_expires_at` from the subscription's period end, plus `subscription_provider` and `subscription_id`. Sets `paid_at` **only if absent**, so a returning customer is not reset to Week 1. Idempotency is keyed on `stripe_session_id` alone; the old `is_paid` check would reject every resubscription, since `is_paid` stays true forever once someone has paid.
- **`invoice.payment_succeeded`** — extends access on renewal, matched by `subscription_id` (the only link back to the user). Returns **500** if nothing matches: someone being charged while their access lapses must surface, not be acked. Also fires for the first charge, which is harmless — it computes the same expiry, so the two handlers are idempotent with each other in any order.
- **`customer.subscription.deleted`** — expires access and clears `subscription_id`. Stripe deletes at period end rather than at cancellation, so the user has already had what they paid for.

If no profile can be matched on the initial purchase, returns a **non-200** so Stripe retries and the failure is surfaced (never silently drops a paid customer). A welcome-email failure does not fail the webhook (payment is already recorded).

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
| `STRIPE_SECRET_KEY` | `/api/stripe/checkout`, `/api/stripe/webhook` | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Reserved — not currently read by any code | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` | Stripe Dashboard → Webhooks → signing secret |
| `RESEND_API_KEY` | `/api/notify-signup`, `/api/contact` | Resend Dashboard → API Keys |
| `NOTIFICATION_EMAIL` | `/api/notify-signup`, `/api/contact` | Your email (comma-separated for multiple) |
| `NEXT_PUBLIC_SITE_URL` | Stripe redirect URLs | Your production URL, e.g. `https://www.theexecutivemeditator.com` |
| `NEXT_PUBLIC_GOOGLE_PLAY_URL` | `/setup/success` download button | Google Play Store listing URL (add once app is live) |
| `NEXT_PUBLIC_APP_STORE_URL` | `/setup/success` download button | Apple App Store listing URL (add once app is live) |
| `SENTRY_DSN` | Server/edge error monitoring (`src/instrumentation.ts`) | Sentry → Project Settings → Client Keys (DSN). Omit to disable (no-op). |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser error monitoring (`src/instrumentation-client.ts`) | Same DSN as above. Omit to disable (no-op). |
| `GA4_MEASUREMENT_ID` | Server-side `purchase_completed` (`src/lib/analytics.ts`) | GA4 → Admin → Data Streams → web stream (`G-…`). Omit to disable (no-op). |
| `GA4_API_SECRET` | Same | GA4 → that stream → Measurement Protocol API secrets → Create. **Secret** — server-side only. |

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
