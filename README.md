# The Executive Meditator

A React Native mobile app (**both platforms submitted, neither publicly launched** — see Release status below) plus a Next.js marketing + purchase website. It guides busy professionals through a **21-day passive micro-meditation program**: instead of long sit-down sessions, the app delivers gently timed push-notification reminders throughout the user's waking hours. When a reminder arrives, the user simply pauses for ~10 seconds — "the Great Silence."

**Backend:** Supabase (Postgres + auth) · OneSignal (push delivery) · a Supabase Edge Function (`send-reminders`) that schedules reminders every 15 minutes · Stripe (payment, on the website) · Resend (transactional email).

> Full system design, data flow, database schema, and environment variables: see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## Features

| Feature | Status |
|---|---|
| 21-day progressive reminder cadence (wk 1 = 60-min, wk 2 = 30-min, wk 3 = 15-min intervals), looping indefinitely | ✅ |
| Passive practice — pause ~10s when a reminder arrives (no in-app countdown/timer) | ✅ |
| Push notifications via OneSignal, scheduled server-side by a Supabase Edge Function | ✅ |
| Timezone- & DST-aware scheduling within each user's awake-hours window | ✅ |
| Compassionate 4-level alarm escalation for missed sessions | ✅ |
| Email/password auth (Supabase) | ✅ |
| Payment gating — app unlocks when `is_paid = true` (purchase happens on the website) | ✅ |
| Indefinite 21-day loop with an opt-out toggle in Settings | ✅ |
| Product analytics — activation, week progression, churn (Firebase Analytics) | ✅ |

> The in-app paywall follows Google Play's **"reader app"** pattern: it does **not** show a price or link out to the web purchase — it only tells unpaid users they need access and offers a support contact. See [src/screens/PaywallScreen.tsx](src/screens/PaywallScreen.tsx).

---

## Release status (as of 2026-08-13)

Neither store is publicly live yet. Both are submitted and waiting.

| Platform | State | Detail |
|---|---|---|
| **Apple App Store** | ⏳ In review | Build `1.0 (1)` submitted 2026-08-11. **Manual release** — approval does not publish; we choose the date. |
| **Google Play** | ⏳ In review | Closed-testing release `10 (1.0.8)` submitted 2026-08-13 with 12 enrolled testers. Google states review takes up to 7 days, then a mandatory **14-day** closed test must complete before "Apply for production" unlocks. |

Build runbooks: **iOS** → [app-store-assets/IOS_BUILD_UPLOAD.md](app-store-assets/IOS_BUILD_UPLOAD.md) · **Android** → [play-store-assets/ANDROID_RELEASE.md](play-store-assets/ANDROID_RELEASE.md)

---

## Tech Stack

- **React Native 0.74** + TypeScript
- **React Navigation 6** (bottom tabs + native stack)
- **Redux Toolkit** (`authSlice`, `meditationSlice`, `notificationSlice`)
- **Supabase** — Postgres database + auth
- **OneSignal 4.5.1** — push notifications
- **Firebase Crashlytics** (`@react-native-firebase`) — crash + JS-error reporting
- **Firebase Analytics** (`@react-native-firebase/analytics`) — product analytics; see [ARCHITECTURE.md](ARCHITECTURE.md) → "Product analytics"
- **Jest + React Native Testing Library** — unit tests

(The website separately uses **Sentry** for error monitoring — see [ARCHITECTURE.md](ARCHITECTURE.md).)

> `react-native-reanimated`, `lottie-react-native`, and `react-native-svg` are present in `package.json` but not currently imported anywhere in `src/` (reserved for future UI work).

---

## Project Structure

```
src/
├── config/
│   └── supabase.ts          # Supabase client (URL + anon key currently hardcoded here)
├── store/
│   ├── index.ts             # Redux store + typed hooks
│   └── slices/
│       ├── authSlice.ts
│       ├── meditationSlice.ts
│       └── notificationSlice.ts
├── navigation/
│   └── AppNavigator.tsx     # Auth stack + main tabs; drives auth-gated + paywall routing
├── screens/
│   ├── AuthScreen.tsx
│   ├── PaywallScreen.tsx    # shown when authenticated but not paid (reader-app pattern)
│   ├── OnboardingScreen.tsx
│   ├── HomeScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── SettingsScreen.tsx   # awake-hours + loop opt-out toggle
│   └── NotificationsScreen.tsx
├── components/
│   ├── AlarmCard.tsx
│   └── Card.tsx
├── hooks/
│   └── useNotifications.ts
├── services/
│   ├── analytics.ts         # product analytics wrapper — typed events + de-dupe guards
│   ├── scheduler.ts         # foreground heartbeat (defined; not currently wired to lifecycle)
│   ├── supabase/
│   │   ├── auth.ts
│   │   └── database.ts
│   └── onesignal/
│       └── notifications.ts # OneSignal init + player-ID sync (App ID hardcoded here)
├── utils/
│   ├── alarms.ts
│   ├── meditation.ts
│   ├── timezone.ts          # device tz detection + DST-aware sync
│   └── weekProgression.ts   # deriveWeek() — source of truth for the program week (from paid_at)
├── theme/
│   └── index.ts
└── assets/
    └── tem-logo.jpg

supabase/
├── schema.sql               # full schema (fresh installs)
├── migrations/              # 001–004: schedule fields, payment fields, loop_enabled, time_zone
└── functions/
    └── send-reminders/
        └── index.ts         # Edge Function — schedules reminders every 15 min (Supabase Cron)

website/                     # Next.js marketing + purchase site (see ARCHITECTURE.md)
```

---

## Setup

### 1. Install dependencies

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..   # iOS only
```

### 2. Backend configuration

- **Mobile app config is currently hardcoded in source** (not read from `.env`): the Supabase URL + anon key live in [src/config/supabase.ts](src/config/supabase.ts), and the OneSignal App ID in [src/services/onesignal/notifications.ts](src/services/onesignal/notifications.ts). The root `.env.example` exists but is not yet wired into the app. Update these constants if forking to your own project.
- **Supabase schema:** in the Supabase SQL editor, run `supabase/schema.sql`, then the files in `supabase/migrations/` in order (001 → 004). For the website's corporate inquiry form, also run `website/supabase/migrations.sql` (creates the `corporate_inquiries` table).
- **Edge Function:** deploy `supabase/functions/send-reminders`, set its secrets, and add a 15-minute cron trigger (see ARCHITECTURE.md → "Supabase Edge Function").
- **Website:** configure `website/.env.local` — the full variable list is in ARCHITECTURE.md → "Environment variables."

### 3. Run

```bash
npm start          # Metro bundler
npm run android    # Android
npm run ios        # iOS (runs in simulator; App Store submission in progress)
```

---

## How the Program Works

- When a user pays, `profiles.paid_at` is set (by the Stripe webhook on the website) and the 21-day clock starts.
- `deriveWeek()` ([src/utils/weekProgression.ts](src/utils/weekProgression.ts)) maps elapsed days to the current week and reminder interval; the `send-reminders` Edge Function recomputes this independently to decide when to push.
- The program loops indefinitely in 21-day cycles (week 1 → 2 → 3 → 1 → …). After the first cycle, Settings shows a toggle to pause/resume the loop (`profiles.loop_enabled`).
- Scheduling is timezone- and DST-aware via [src/utils/timezone.ts](src/utils/timezone.ts), re-synced on sign-in and whenever the app returns to the foreground.
- The app itself does **not** schedule local notifications — all push scheduling is driven server-side by the Edge Function.

---

## Alarm Levels

| Level | Trigger | Colour | Tone |
|---|---|---|---|
| Subtle | 1 missed session | Green | Gentle nudge |
| Mild | 2–3 missed | Yellow | Fatigue / low energy |
| Dis-ease | 4–6 missed | Orange | Emotional imbalance |
| Critical | 7+ missed | Red | Cannot be ignored |

All alarms are compassionate and non-punitive.

---

## Testing

```bash
npm test           # Jest + React Native Testing Library
```

Test suites live in `__tests__/` (utils: weekProgression, timezone, meditation; store: meditationSlice; components: AlarmCard; services: analytics). The website has its own suite — `cd website && npm test`.

Counts as of 2026-08-13: **92 root** + **30 website**, all passing, zero type errors in either project.

---

## Roadmap

- [ ] iOS App Store release (submitted — awaiting Apple)
- [ ] Google Play production release (closed test in review; 14-day test period still to run)
- [ ] **Raise `IPHONEOS_DEPLOYMENT_TARGET` 13.4 → 15.0** — Apple rejects uploads below 15.0 from **Spring 2027** (`ITMS-90068`). Drops iOS 13/14 devices, so it is a deliberate call; revisit ~Nov 2026.
- [ ] Wire environment-based config (replace hardcoded Supabase/OneSignal constants)
- [ ] Apple HealthKit / Google Fit integration
- [ ] Wearable biofeedback (HRV)
- [ ] Supabase Edge Function enhancements for richer scheduling
- [ ] Haptic feedback on meditation completion
