#!/usr/bin/env bash
# Build the Firefox package and (optionally) sign + submit a listed version to AMO.
#
# Usage:
#   ./release.sh            build the FF-only zip AND sign+submit to AMO (listed)
#   ./release.sh --zip-only build the zip only (no AMO creds needed)
#   ./release.sh --lint     run web-ext lint and exit
#
# Credentials: reads ./amo-credentials.local (gitignored) with lines:
#   AMO_JWT_ISSUER=user:...
#   AMO_JWT_SECRET=<64 hex chars>
set -euo pipefail
cd "$(dirname "$0")"

# Files that ship in the Firefox package. The chrome/ port is intentionally excluded.
FILES=(manifest.json main.js labelsModule.js settingsModule.js background.js \
       util.js styles.css options.html jquery.js icon.png README.md)

VERSION="$(node -e "console.log(require('./manifest.json').version)")"
ZIP="gallery-wg-${VERSION}.zip"
IGNORE=(--ignore-files "chrome/**" ".cursor/**" "*.ps1" "*.sh" "*.zip" "*.xpi" "*.local")

lint() {
  npx --yes web-ext@latest lint "${IGNORE[@]}"
}

build_zip() {
  rm -f "$ZIP"
  zip -q "$ZIP" "${FILES[@]}"
  echo "built $ZIP"
  unzip -l "$ZIP" | tail -n +4
}

load_creds() {
  [ -f amo-credentials.local ] || { echo "ERROR: amo-credentials.local not found"; exit 1; }
  # cut value after first '=', strip CR/LF defensively (handles Windows-pasted keys)
  ISS="$(grep '^AMO_JWT_ISSUER=' amo-credentials.local | head -1 | cut -d= -f2- | tr -d '\r\n')"
  SEC="$(grep '^AMO_JWT_SECRET=' amo-credentials.local | head -1 | cut -d= -f2- | tr -d '\r\n')"
  [ -n "$ISS" ] && [ -n "$SEC" ] || { echo "ERROR: issuer/secret missing in amo-credentials.local"; exit 1; }
  [ "${#SEC}" -eq 64 ] || { echo "ERROR: secret length is ${#SEC}, expected 64"; exit 1; }
}

sign() {
  load_creds
  local stage; stage="$(mktemp -d)"
  cp "${FILES[@]}" "$stage/"
  echo "submitting listed v${VERSION} to AMO..."
  WEB_EXT_API_KEY="$ISS" WEB_EXT_API_SECRET="$SEC" \
    npx --yes web-ext@latest sign --channel listed \
      --source-dir "$stage" --artifacts-dir web-ext-artifacts --approval-timeout 0
  rm -rf "$stage"
}

case "${1:-}" in
  --zip-only) build_zip ;;
  --lint)     lint ;;
  "")         echo "=== version ${VERSION} ==="; build_zip; echo; sign ;;
  *)          echo "unknown arg: $1"; sed -n '2,12p' "$0"; exit 2 ;;
esac
