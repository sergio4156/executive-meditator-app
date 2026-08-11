# iOS Build & Upload — CLI runbook

How to archive + sign + upload the iOS build to App Store Connect from the terminal
(the Xcode GUI's automatic signing fails on this account — see "Why" below).

## ⛔ BLOCKERS as of 2026-08-10 (must fix before upload succeeds)
1. **Xcode too old.** Mac has Xcode 16.2 (iOS 18.2 SDK). Apple **requires the iOS 26 SDK (Xcode 26+)**
   for all App Store uploads (enforced ~2026). **Update Xcode to 26** (Mac App Store → Updates,
   or developer.apple.com/download). ~10–15 GB. After updating: `cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install` (pods rebuild for new toolchain).
2. **Bitcode in OneSignal.** `OneSignalXCFramework 3.12.4` ships bitcode; Apple rejects it
   ("Invalid Executable ... contains bitcode"). Fix options:
   - **Strip bitcode** (preferred, low-risk): add a Podfile `post_install` step or run before archive:
     ```
     for fw in OneSignal OneSignalCore OneSignalExtension OneSignalOutcomes; do
       f="ios/Pods/OneSignalXCFramework/.../$fw.framework/$fw"   # per-arch path in the built .app
       xcrun bitcode_strip -r "$f" -o "$f"
     done
     ```
     Simplest: strip from the built .app's Frameworks/ before export (or add a Run Script build phase
     that runs `xcrun bitcode_strip -r "$framework" -o "$framework"` over ${BUILT_PRODUCTS_DIR}).
   - OR update react-native-onesignal to 5.x (OneSignal 5, no bitcode) — BREAKING, needs code migration;
     risky since Android is live on current version. Prefer stripping for launch.

## Credentials (IDs are NOT secret; the .p8 files ARE secret — store in password manager)
- **Team ID:** 2ZT4C82JS8
- **App Store Connect API key:** Key ID `6488MA37WP`, Issuer ID `f9073a1f-3c7e-4c0d-8ca1-f60780d79848`,
  role Admin. File stored at `~/Documents/executive-meditator-credentials/AuthKey_6488MA37WP.p8`
  (outside the repo; also back up in password manager).
- **APNs key** (OneSignal, separate): Key ID `UXWL3JH82L`, `AuthKey_UXWL3JH82L.p8` (same secure folder).
- App ID / bundle: com.executivemeditator.app.  ASC app id (Apple ID): 6800176255.

## Why CLI (not the Xcode GUI Archive)
Automatic signing during `xcodebuild archive` tries to make an **iOS App *Development*** profile,
which requires ≥1 registered device — this brand-new account has none → "Communication with Apple
failed: your team has no devices." Fix: **archive UNSIGNED**, then **export for app-store-connect**
(distribution profiles need no device), authenticated by the **API key** (bypasses the flaky Xcode
account session).

## Steps (run from repo root)
```
cd ios

# 1) Unsigned archive (no profile needed at archive time)
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 xcodebuild \
  -workspace ExecutiveMeditator.xcworkspace -scheme ExecutiveMeditator \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath build/ExecutiveMeditator.xcarchive \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO archive

# 1b) STRIP BITCODE from OneSignal frameworks in the archive (see blocker #2) before export.

# 2) Export + upload (creates Apple Distribution cert + App Store profile via the API key, no device)
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 xcodebuild -exportArchive \
  -archivePath build/ExecutiveMeditator.xcarchive \
  -exportOptionsPlist ../app-store-assets/ios-ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/Documents/executive-meditator-credentials/AuthKey_6488MA37WP.p8 \
  -authenticationKeyID 6488MA37WP \
  -authenticationKeyIssuerID f9073a1f-3c7e-4c0d-8ca1-f60780d79848
```
`ios-ExportOptions.plist`: method=app-store-connect, teamID=2ZT4C82JS8, signingStyle=automatic,
destination=upload (uploads directly), manageAppVersionAndBuildNumber=false.

## After a successful upload
- Build appears in App Store Connect → TestFlight (processing ~5–30 min).
- On the version page (app 6800176255), select the build under "Build", add screenshots, then **Submit for Review**.
- App review notes + demo login (appreview@) already entered. Manual release selected.
