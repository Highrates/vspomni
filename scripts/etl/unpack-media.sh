#!/usr/bin/env bash
# Unpack Vspomni prod media tarball for ETL image copy.
#
#   ./scripts/etl/unpack-media.sh
#   ./scripts/etl/unpack-media.sh dumps/vspomni_media_2026-10-07.tgz
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TGZ="${1:-$ROOT/dumps/vspomni_media_2026-10-07.tgz}"
DEST="${SALEOR_MEDIA_ROOT:-$ROOT/scripts/etl/.media-cache}"

if [[ ! -f "$TGZ" ]]; then
  echo "Media archive not found: $TGZ" >&2
  exit 1
fi

mkdir -p "$DEST"
# wipe previous unpack of this cache (keep dir)
find "$DEST" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
echo "==> unpack $TGZ → $DEST"
tar -xzf "$TGZ" -C "$DEST"
echo "--- top-level ---"
ls -la "$DEST" | head -30
echo "files=$(find "$DEST" -type f | wc -l | tr -d ' ')"
echo "OK: SALEOR_MEDIA_ROOT=$DEST"
