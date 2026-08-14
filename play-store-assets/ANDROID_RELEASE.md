# Android build & release — runbook

How to cut an AAB and get it onto a Google Play track. Written 2026-08-13 after shipping
`10 (1.0.8)` to closed testing; the traps below all cost real time at least once.

## Build

```bash
# 1) Bump BOTH values in android/app/build.gradle — Play rejects same-or-lower versionCode
#    versionCode 10 -> 11 ; versionName "1.0.8" -> "1.0.9"

# 2) Build the signed release bundle
cd android && ./gradlew bundleRelease

# 3) Output
#    android/app/build/outputs/bundle/release/app-release.aab
```

Signing uses the release keystore at `~/executive-meditator-release.jks`. **A different keystore is
rejected with no recovery path** short of Play App Signing support. Play App Signing is enabled, so
this key is the *upload* key and Google re-signs for distribution.

## ⚠️ MANDATORY CHECK BEFORE EVERY UPLOAD — advertising ID

`play-services-measurement` (pulled in by Firebase Analytics) declares **three** ad-related
permissions under **different names**. Our Play Data Safety filing declares **"Advertising ID: No"**,
so letting any of them merge in makes that filing false — a policy violation, not a warning.

All three are stripped via `tools:node="remove"` in `android/app/src/main/AndroidManifest.xml`, plus
`google_analytics_adid_collection_enabled=false` in `res/values/strings.xml`. Verify the *merged*
manifest, not the source:

```bash
grep -E "AD_ID|ADSERVICES" \
  android/app/build/intermediates/merged_manifest/release/AndroidManifest.xml
```

**Must return nothing.** Removing only `com.google.android.gms.permission.AD_ID` is NOT enough —
`android.permission.ACCESS_ADSERVICES_AD_ID` and `..._ATTRIBUTION` are separate strings and were
missed on the first attempt. Trace any new arrival with
`android/app/build/outputs/logs/manifest-merger-release-report.txt`.

## Upload to a track (Play Console)

1. **Test and release → Testing → Closed testing → Manage track**
2. **Testers tab first** — attach an email list and tick its checkbox. Creating a list does not
   attach it. Set the feedback channel to `admin@theexecutivemeditator.com`.
3. **Releases tab → Create new release.** If a draft already exists the button is greyed out —
   use **Edit release** on the draft instead, and remove the stale bundle from it.
4. Upload the AAB, set the release name to match (`11 (1.0.9)`), and write release notes **inside
   the language tags** — bare text errors with "Line 1: text outside language tags":
   ```
   <en-US>
   Closed testing build. Micro-meditation reminders on a 21-day program.
   </en-US>
   ```
5. **Save**, then **Publishing overview → Submit changes for review.** Changes stage up and go as
   one submission; don't submit twice.

Expect one benign warning: *"There is no deobfuscation file associated with this App Bundle."*
Minification is off (`enableProguardInReleaseBuilds = false`), so stack traces are already readable
and there is nothing to de-obfuscate.

## Declarations that must stay true

Two were found **wrong** on 2026-08-13, either of which could have caused rejection:

- **Sign in details** (formerly "App access") must say access **is** restricted, with the
  `appreview@theexecutivemeditator.com` credentials. The app needs both a login and a paid account;
  a reviewer who hits the paywall cannot review, and that is a top Play rejection cause. It had been
  filed as "All functionality available without special access."
- **Data safety** must list **Analytics** as a purpose for *App interactions* and *Device or other
  IDs*, because the app ships Firebase Analytics. Re-check this whenever an SDK is added or removed.

## The closed-testing clock (production gate)

Google requires **12 testers opted in for 14 continuous days** before "Apply for production"
unlocks. Two things that are easy to get wrong:

- **The opt-in link does not exist until a release is actually rolled out.** A draft release means
  nobody can join, so recruited-but-not-enrolled testers count for nothing. This is exactly what had
  silently stalled the launch for weeks.
- **The clock starts when the 12th tester accepts**, not when you upload. Distribute the link the
  moment the track goes live.

Uploading a *new* build to the track mid-test does **not** reset the tester clock.

## Release history

| versionCode | versionName | Notes |
|---|---|---|
| 10 | 1.0.8 | Firebase Analytics + AD_ID/ADSERVICES strip. Submitted to closed testing 2026-08-13. |
| 9 | 1.0.7 | Contact email → admin@theexecutivemeditator.com |
| 8 | 1.0.6 | Firebase Crashlytics |
| 7 | 1.0.5 | Accessibility props |
| 6 | 1.0.4 | Play Billing paywall fix (reader-app pattern) |
