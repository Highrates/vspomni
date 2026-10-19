#!/usr/bin/env bash
# Front вне root workspaces; @vspomni/hero-types — file:../packages/hero-types.
# Перед Front build обязательно dist пакетов (build:packages).
set -euo pipefail
cd /opt/vspomni
LOG=/tmp/vspomni-deploy-front.log
exec > >(tee "$LOG") 2>&1
echo "==> start $(date -Is)"
unset NODE_ENV

if [[ ! -d node_modules ]]; then
  echo "==> npm ci (workspace — нужен для build:packages / hero-types)"
  npm ci
fi
echo "==> build:packages (hero-types → Front file: dep)"
npm run build:packages

echo "==> Front npm ci + build"
(
  cd Front
  npm ci
  npm run build
)
systemctl restart vspomni-front
sleep 2
systemctl is-active vspomni-front
# ensure video is present after rsync
ls -lah Front/public/videos/1-ch-web.mp4
# also copy into standalone public if used
if [[ -d Front/.next/standalone ]]; then
  mkdir -p Front/.next/standalone/public/videos
  cp -f Front/public/videos/1-ch-web.mp4 Front/.next/standalone/public/videos/ 2>/dev/null || true
  cp -f Front/public/videos/1-ch-poster.jpg Front/.next/standalone/public/videos/ 2>/dev/null || true
fi
echo "==> DONE $(date -Is)"
