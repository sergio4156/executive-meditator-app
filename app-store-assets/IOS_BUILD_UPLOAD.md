# iOS Build & Upload — CLI runbook

How to archive + sign + upload the iOS build to App Store Connect from the terminal
(the Xcode GUI's automatic signing fails on this account — see "Why" below).

## ✅ STATUS: build `1.0 (1)` uploaded 2026-08-11, "Ready to Submit", submitted to App Review
This runbook worked end to end. Below is what actually blocked it and how each resolved — keep it,
because the environment problems recur on any new machine or Xcode upgrade.

### Environment setup (one-time per machine)
1. **Xcode 26 + macOS 26.** The App Store install of Xcode 26.6 was not sufficient on its own; it
   left two traps:
   - **The license was never accepted**, so Xcode.app aborted on launch (`Abort trap: 6`) and its
     first-launch task never ran. The crash report's `asi` field says so verbatim — a GUI that dies
     instantly with no dialog is *usually* this.
   - Because first launch never ran, `/Library/Developer/PrivateFrameworks/CoreDevice.framework`
     stayed at pkg version **16.2** and could not link macOS 26's Mercury framework, producing
     `dlopen(libxcodebuildLoader.dylib): Symbol not found: _XPCTypeBool` on `xcodebuild`, `otool`
     and every `xcrun` shim.

   **Fix (needs your password — an agent cannot sudo):**
   ```
   sudo xcodebuild -license accept
   sudo xcodebuild -runFirstLaunch
   ```
2. **The iOS platform is a separate ~8.5 GB download.** App Store Xcode ships the SDK but not the
   platform bundle (`iPhoneOS.platform` was a 156 MB stub), so `ibtool` failed the archive with
   `LaunchScreen.storyboard: error: iOS 26.5 Platform Not Installed`. No sudo needed:
   ```
   xcodebuild -downloadPlatform iOS
   ```
   This also installs the iOS Simulator runtime used for App Store screenshots.

### Build-content notes
3. **Bitcode must be stripped.** `app-store-assets/ios-strip-bitcode.sh` handles it, over *every*
   embedded framework rather than a hardcoded list — **`hermes.framework` carried bitcode too**, and
   an OneSignal-only loop would have missed it and been rejected. Verified afterwards: 0 `__LLVM`
   segments, arm64 intact.
4. **OneSignal 3.12.4 under Xcode 26: NON-ISSUE.** It compiled and linked fine. The feared 5.x
   migration was not needed — do **not** upgrade it pre-emptively.

### Known upload warnings (both benign for now)
- `ITMS-90738` — empty `NSLocationWhenInUseUsageDescription`. **Fixed** (commit `0f73d383`) by
  deleting the key; the app never uses location, so no purpose string was invented.
- `ITMS-90068` — `MinimumOSVersion` 13.4. **Deliberately deferred.** Apple blocks uploads below
  15.0 from **Spring 2027**; bumping now would drop iOS 13/14 devices. Revisit ~Nov 2026.
- dSYMs missing for the OneSignal frameworks and hermes — third-party prebuilt binaries ship none.
  Costs crash symbolication for those frameworks only.

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

# 1b) STRIP BITCODE from the archive's embedded frameworks — required before export
../app-store-assets/ios-strip-bitcode.sh

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
