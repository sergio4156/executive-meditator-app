# iOS Build & Upload — CLI runbook

How to archive + sign + upload the iOS build to App Store Connect from the terminal
(the Xcode GUI's automatic signing fails on this account — see "Why" below).

## ⛔ BLOCKERS as of 2026-08-11 (must fix before upload succeeds)
1. **Xcode too old — THE ONLY REMAINING MANUAL STEP.**
   - ✅ macOS is now **Tahoe 26.6.1** (was the prerequisite for Xcode 26).
   - 🔴 Xcode is still **16.2**, and it no longer runs at all on macOS 26 — `xcodebuild`, `otool`,
     and every `xcrun` shim fail with `dlopen(libxcodebuildLoader.dylib): Symbol not found: _XPCTypeBool`.
     There is **no toolchain on this machine right now**; nothing iOS can be built or inspected until
     Xcode 26 is installed.
   - **Fix: install Xcode 26** — Mac App Store (search "Xcode" → Update/Get) or
     developer.apple.com/download (sign in with the LLC Apple ID → Xcode 26 .xip).
     ~12 GB download, ~35 GB installed; 86 GB free as of 2026-08-11, so space is fine.
   - After installing:
     ```
     sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
     sudo xcodebuild -license accept
     xcodebuild -version            # expect 26.x
     cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
     ```
2. **Bitcode in OneSignal.** `OneSignalXCFramework 3.12.4` ships bitcode; Apple rejects it
   ("Invalid Executable ... contains bitcode").
   - ✅ **SOLVED — script ready:** `app-store-assets/ios-strip-bitcode.sh` strips bitcode from every
     embedded framework in the built archive. Run it between step 1 and step 2 below. No pbxproj or
     Podfile changes needed, and it's a no-op on frameworks that are already clean.
   - Alternative (NOT recommended pre-launch): upgrade react-native-onesignal to 5.x — breaking
     migration, and Android is live on the current version.
3. **⚠️ Watch for: OneSignal 3.12.4 may not compile under Xcode 26.** It is an old SDK whose device
   slice is `ios-arm64_armv7_armv7s` (armv7 era). If `pod install` or the archive fails on OneSignal
   under the new toolchain, the fallback is the react-native-onesignal 5.x upgrade. Unknown until
   Xcode 26 is installed — this is the main residual risk in the build.

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

# 1b) STRIP BITCODE from the archive's embedded frameworks (blocker #2) — required before export
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
