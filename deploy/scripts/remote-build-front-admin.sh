#!/usr/bin/env bash
# Запуск на VPS: сборка Front + Admin без привязки к SSH-сессии.
# Front вне workspaces → сначала build:packages (@vspomni/hero-types file:).
set -euo pipefail
cd /opt/vspomni
LOG=/tmp/vspomni-deploy-build.log
exec > >(tee "$LOG") 2>&1

echo "==> start $(date -Is)"
unset NODE_ENV

if [[ ! -d node_modules ]]; then
  echo "==> npm ci (workspace)"
  npm ci
fi
echo "==> build:packages (нужно Admin + Front file: hero-types)"
npm run build:packages

echo "==> Front npm ci + build"
(
  cd Front
  npm ci
  npm run build
)
echo "==> restart vspomni-front"
systemctl restart vspomni-front
sleep 2
systemctl is-active vspomni-front

echo "==> build admin"
npm run build -w vspomni-admin
echo "==> restart vspomni-admin"
systemctl restart vspomni-admin
sleep 2
systemctl is-active vspomni-admin

echo "==> DONE $(date -Is)"
