# The Executive Meditator

A cross-platform React Native app (iOS + Android) that guides busy professionals through a progressive micro-meditation program, with compassionate alarms, accumulation tracking, and gamified motivation.

**Backend: Supabase (auth + database) + OneSignal (push notifications)**

---

## Features

| Feature | Status |
|---|---|
| 3-week progressive schedule (60 / 30 / 15 min intervals) | ✅ |
| 10-second guided meditation with animated countdown | ✅ |
| Start / Pause / Skip controls | ✅ |
| Compassionate 4-level alarm system | ✅ |
| Push notifications (OneSignal) | ✅ |
| Session logging to Supabase (PostgreSQL) | ✅ |
| Points, streaks & badge system | ✅ |
| Lottie "Monad hook-up" animation (placeholder) | ✅ |
| Progress dashboard with history | ✅ |
| Email/password + anonymous auth (Supabase) | ✅ |
| Oneness milestone tracking | ✅ |
| Payment gating — app locked until purchase on website | ✅ |
| Wearable integration | 🔜 |

---

## Tech Stack

- **React Native 0.74** + TypeScript
- **React Navigation 6** (bottom tabs + native stack)
- **Redux Toolkit** (auth, meditation, notifications slices)
- **Supabase** — PostgreSQL database + auth (zero native deps, no CocoaPods pain)
- **OneSignal 4** — push notifications + scheduled reminders
- **React Native Reanimated 3** (animated timer ring, progress bar)
- **Lottie React Native** (completion animation)
- **Jest + React Native Testing Library**

---

## Project Structure

```
src/
├── config/
│   └── supabase.ts          # Supabase client + table names
├── store/
│   ├── index.ts             # Redux store + typed hooks
│   └── slices/
│       ├── authSlice.ts
│       ├── meditationSlice.ts
│       └── notificationSlice.ts
├── navigation/
│   └── AppNavigator.tsx     # Auth stack + main tabs
├── screens/
│   ├── AuthScreen.tsx
│   ├── PaywallScreen.tsx    # shown when authenticated but not paid
│   ├── OnboardingScreen.tsx
│   ├── HomeScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── SettingsScreen.tsx
│   └── NotificationsScreen.tsx
├── components/
│   ├── Card.tsx
│   ├── MeditationTimer.tsx
│   ├── ProgressBar.tsx
│   ├── AlarmCard.tsx
│   └── BadgeDisplay.tsx
├── hooks/
│   ├── useMeditation.ts     # Countdown + Supabase sync
│   ├── useDatabase.ts       # Data loading from Supabase
│   └── useNotifications.ts
├── services/
│   ├── supabase/
│   │   ├── auth.ts
│   │   └── database.ts
│   └── onesignal/
│       └── notifications.ts
├── utils/
│   ├── meditation.ts
│   └── alarms.ts
└── theme/
    └── index.ts
supabase/
└── schema.sql               # Run this in Supabase SQL editor
```

---

## Setup

### 1. Install dependencies

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..
```

### 2. Supabase setup (5 minutes)

1. Go to [supabase.com](https://supabase.com) → create a free project
2. Go to **SQL Editor** → paste and run `supabase/schema.sql`
3. Go to **Settings → API** → copy Project URL and anon key
4. Copy `.env.example` to `.env` and fill in your values

### 3. OneSignal setup

1. Go to [onesignal.com](https://onesignal.com) → create a free app
2. Select **Apple iOS** → follow the APNs certificate steps
3. Copy your App ID into `.env` as `ONESIGNAL_APP_ID`

### 4. Run

```bash
# Start Metro bundler
npm start

# iOS (in a second terminal)
npm run ios

# Android
npm run android
```

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

## Oneness Milestone

Unlocked after 100 total completed sessions (production: ≥ 80% weekly adherence for 3 consecutive weeks). Awards the `oneness` badge, +100 pts, and a persistent banner.

---

## Roadmap

- [ ] Apple HealthKit / Google Fit integration
- [ ] Wearable biofeedback (HRV)
- [ ] Community features (group streaks, leaderboards)
- [ ] Custom Lottie Monad animation
- [ ] Supabase Edge Functions for server-side notification scheduling
- [ ] Haptic feedback on meditation completion
