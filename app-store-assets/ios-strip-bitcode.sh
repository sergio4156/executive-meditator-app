#!/bin/bash
# Strip bitcode from every embedded framework in a built .xcarchive.
#
# Why: OneSignalXCFramework 3.12.4 ships with bitcode, and Apple rejects uploads
# containing it ("Invalid Executable ... contains bitcode"). Bitcode has been
# deprecated since Xcode 14 and carries no benefit, so stripping is safe.
#
# Run this AFTER `xcodebuild archive` and BEFORE `xcodebuild -exportArchive`.
#
# Usage: ./app-store-assets/ios-strip-bitcode.sh [path/to/App.xcarchive]
#        (defaults to ios/build/ExecutiveMeditator.xcarchive)

set -euo pipefail

ARCHIVE="${1:-$(dirname "$0")/../ios/build/ExecutiveMeditator.xcarchive}"

if [ ! -d "$ARCHIVE" ]; then
  echo "error: archive not found at $ARCHIVE" >&2
  exit 1
fi

APP="$(find "$ARCHIVE/Products/Applications" -maxdepth 1 -name '*.app' | head -1)"
if [ -z "$APP" ]; then
  echo "error: no .app inside $ARCHIVE/Products/Applications" >&2
  exit 1
fi

echo "Archive: $ARCHIVE"
echo "App:     $APP"

stripped=0
# Every Mach-O binary inside an embedded .framework (plus any app extensions'
# frameworks, e.g. a OneSignal Notification Service Extension).
while IFS= read -r fw; do
  name="$(basename "$fw" .framework)"
  bin="$fw/$name"
  [ -f "$bin" ] || continue

  if xcrun bitcode_strip -r "$bin" -o "$bin.nobitcode" 2>/dev/null; then
    mv "$bin.nobitcode" "$bin"
    echo "  stripped: $name"
    stripped=$((stripped + 1))
  else
    rm -f "$bin.nobitcode"
    echo "  skipped:  $name (bitcode_strip declined; likely already clean)"
  fi
done < <(find "$APP" -name '*.framework' -type d)

echo "Done — $stripped framework binaries stripped."
echo "Next: xcodebuild -exportArchive (see IOS_BUILD_UPLOAD.md step 2)"
