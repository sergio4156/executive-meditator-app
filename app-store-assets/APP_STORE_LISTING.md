# App Store Connect — Listing & Submission Reference

Copy-paste-ready values for creating the App Store Connect record for **The Executive Meditator** (iOS).
Adapted from the Google Play listing; aligns with the live website voice. Owner should review before submitting.

App is **iPhone-only** (`TARGETED_DEVICE_FAMILY = 1`) → only iPhone screenshots required, no iPad.

---

## App record (create in App Store Connect → Apps → +)
- **Platform:** iOS
- **Name** (≤30): `The Executive Meditator` (23)
- **Primary language:** English (U.S.)
- **Bundle ID:** `com.executivemeditator.app` (select the App ID once created in Certificates/IDs/Profiles)
- **SKU** (internal, any unique string): `TEM-IOS-001`
- **User Access:** Full Access

## Version information
- **Subtitle** (≤30): `Micro-meditation for leaders` (28)
- **Promotional text** (≤170, editable anytime without review):
  `Reclaim 10 seconds of stillness in the middle of your busiest day — a 21-day micro-meditation program built for leaders who don't have time to meditate.`
- **Keywords** (≤100 chars, comma-separated, NO spaces):
  `mindfulness,calm,focus,productivity,stillness,stress,leader,breathe,anxiety,relax,wellness,zen`
- **Description** (≤4000):
```
The most powerful competitive advantage isn't a tool, a strategy, or a framework. It's stillness.

The Executive Meditator is a 21-day micro-meditation program built for people who don't have time to meditate — leaders, founders, and professionals who run at full speed all day.

No 30-minute sessions. No cushions. No app demanding another hour you don't have.

Instead, The Executive Meditator delivers brief, perfectly timed reminders throughout your waking hours. When one arrives, you pause for just 10 seconds and enter what we call the Great Silence — a moment of complete inner stillness you can return to anytime, anywhere, for the rest of your life.

HOW IT WORKS
• Set your awake hours (a minimum of 5 is recommended)
• Receive gentle reminders throughout the day
• When a reminder arrives, pause for 10 seconds of stillness
• Over 21 days, the practice becomes second nature

WHAT YOU GET
• The complete 21-day program
• Lifetime access — one-time purchase, no subscription
• A practice that fits into even the busiest schedule

Returns: Peace. Productivity. Profits. What once took monks a lifetime, now in 21 days.

The Executive Meditator. Stillness, on your schedule.
```
- **Support URL:** `https://www.theexecutivemeditator.com`
- **Marketing URL** (optional): `https://www.theexecutivemeditator.com`
- **Copyright:** `© 2026 Executive Meditator LLC`
- **Version:** `1.0` (matches MARKETING_VERSION in Xcode; build number auto from CURRENT_PROJECT_VERSION)

## Category
- **Primary:** Health & Fitness
- **Secondary:** Lifestyle

## Pricing & Availability
- **Price:** Free
- **Availability:** All territories (or per owner preference)

## Age rating
Answer the questionnaire with **None / No** to every content category (no violence, sexual content, profanity, drugs/alcohol, gambling, horror, mature themes, contests, unrestricted web). No user-generated content, no messaging, no location sharing.
→ Expected result: **4+**

## App Privacy ("nutrition labels")  (App Store Connect → App Privacy)
Mirror of the submitted Google Play Data Safety. **No data is used for tracking** (no ads/data brokers).

**Data Linked to You** (tied to account identity):
- **Contact Info → Email Address** — Purpose: App Functionality (login/account). Processed by Supabase.
- **Identifiers → Device ID** — Purpose: App Functionality (OneSignal push token, to deliver meditation reminders).
- **Usage Data → Product Interaction** — Purpose: App Functionality (awake-hours schedule, reminders delivered, program progress).

**Data Not Linked to You:**
- **Diagnostics → Crash Data** — Purpose: App Functionality (Firebase Crashlytics).

**Data Used to Track You:** None.

Note: the customer's **name + payment info** are collected at purchase on the **website via Stripe**, NOT in the app. The app only reads paid/unpaid status.

## App Review Information (App Store Connect → App Review Information)
- **Sign-In Required:** YES
  - **Username:** `appreview@theexecutivemeditator.com`
  - **Password:** *(enter the real password here from Sergio's password manager — NOT stored in this file)*
- **Notes:**
```
This app uses a multi-platform "reader" model. The 21-day program is purchased on our website (theexecutivemeditator.com) via Stripe; the app grants access to accounts that have already paid. There is NO in-app purchase, and the app does not link to or advertise the external purchase.

The provided demo account (appreview@theexecutivemeditator.com) is already marked as paid, so you can review the full experience: onboarding, setting awake hours, the meditation/home screen, dashboard, and settings.

The app is notification-driven: after onboarding you set your awake hours and receive gentle push reminders to pause for a 10-second meditation. Push notifications require a physical device; in the simulator the entire UI is navigable but pushes won't arrive.
```
- **Contact:** Sergio Angel — admin@theexecutivemeditator.com — (415) 724-4145

## Export compliance
Handled in code: `ITSAppUsesNonExemptEncryption = NO` in Info.plist (app uses only standard HTTPS/exempt encryption) → no per-submission export prompt.

## Screenshots (REQUIRED — iPhone only)
Apple requires at least the **6.9" display** set (also accepts/derives 6.5"):
- **6.9" (iPhone 16 Pro Max):** 1320 × 2868 px (portrait). Min 1, up to 10.
- (Optional) 6.5" (iPhone 11 Pro Max / 14 Plus): 1242 × 2688 or 1284 × 2778.
Capture from the simulator: Home/meditation screen, Dashboard/progress, Onboarding (awake hours), Settings. See `app-store-assets/screenshots/` and the capture steps in the session notes.

## Still requires the active account (portal work — now unblocked)
1. **APNs Auth Key (.p8)** — Certificates, IDs & Profiles → Keys → + → enable Apple Push Notifications service (APNs) → download once → upload Key ID + Team ID + .p8 to OneSignal (iOS platform).
2. **App ID / Identifier** — register `com.executivemeditator.app` with the **Push Notifications** capability enabled (Xcode automatic signing may create it; verify push capability).
3. **Signing** — let Xcode "Automatically manage signing" with team = Executive Meditator LLC.
4. **Archive & upload** the build to App Store Connect (Xcode → Product → Archive → Distribute).
5. **OneSignal Notification Service Extension** target in Xcode (for rich/confirmed delivery) + App Group.
