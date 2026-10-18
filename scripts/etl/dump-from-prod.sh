#!/usr/bin/env bash
# Dump Vspomni prod Saleor Postgres + media. Does NOT touch Miraflores.
#
# Prod (confirmed): 91.229.9.11  path /opt/saleor/vspomni-saleor
# Miraflores (do not dump):     91.229.8.83
#
#   ./scripts/etl/dump-from-prod.sh
#   DEPLOY_SSH_KEY=~/.ssh/id_ed25519 ./scripts/etl/dump-from-prod.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${DEPLOY_HOST:-root@91.229.9.11}"
KEY="${DEPLOY_SSH_KEY:-}"
REMOTE_APP="${DEPLOY_PATH:-/opt/saleor/vspomni-saleor}"
STAMP="$(date +%Y-%m-%d)"
DUMPS="$ROOT/dumps"
OUT_SQL="$DUMPS/vspomni_saleor_${STAMP}.sql"
OUT_MEDIA="$DUMPS/vspomni_media_${STAMP}.tgz"
REMOTE_SQL="/tmp/vspomni_saleor_${STAMP}.sql"
REMOTE_MEDIA="/tmp/vspomni_media_${STAMP}.tgz"

mkdir -p "$DUMPS"

SSH=(ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15)
SCP=(scp -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15)
if [[ -n "$KEY" ]]; then
  SSH+=(-i "$KEY")
  SCP+=(-i "$KEY")
fi

echo "==> SSH $HOST"
if ! "${SSH[@]}" "$HOST" 'echo ssh_ok'; then
  cat <<EOF

SSH до $HOST не открылся (timeout / ключ / firewall).

Прод Vspomni: 91.229.9.11  (/opt/saleor/vspomni-saleor)
Это НЕ 91.229.8.83 (Miraflores) — тот сервер дампить нельзя.

Когда VPS снова отвечает, либо открой SSH с сети, откуда раньше заходил
(\`ssh root@91.229.9.11\`), либо выполни блок ниже в консоли REG.RU / Timeweb
и скачай файлы:

# --- на VPS ---
cd ${REMOTE_APP}
DB=\$(docker compose ps -q db)
docker exec "\$DB" pg_dump -U saleor -d saleor --no-owner --no-acl -f /tmp/vspomni_inside.sql
docker cp "\$DB":/tmp/vspomni_inside.sql /tmp/vspomni_saleor.sql
# канал обязан быть vspomni-site, не miraflores-site
docker exec "\$DB" psql -U saleor -d saleor -c "SELECT slug FROM channel_channel;"
VOL=\$(docker volume ls -q | grep -E 'vspomni.*media' | head -1)
tar -C /var/lib/docker/volumes/\${VOL}/_data -czf /tmp/vspomni_media.tgz .
ls -lh /tmp/vspomni_saleor.sql /tmp/vspomni_media.tgz

# --- на Mac ---
scp ${HOST}:/tmp/vspomni_saleor.sql "${OUT_SQL}"
scp ${HOST}:/tmp/vspomni_media.tgz "${OUT_MEDIA}"
EOF
  exit 1
fi

echo "==> remote dump (compose dir $REMOTE_APP)"
"${SSH[@]}" "$HOST" "STAMP='$STAMP' REMOTE_APP='$REMOTE_APP' bash -s" <<'REMOTE'
set -euo pipefail
cd "$REMOTE_APP"

DB_CTR=""
if docker compose ps -q db >/dev/null 2>&1; then
  DB_CTR="$(docker compose ps -q db || true)"
fi
if [[ -z "$DB_CTR" ]]; then
  echo "ERROR: no compose db in $REMOTE_APP" >&2
  docker ps --format 'table {{.Names}}\t{{.Label "com.docker.compose.project.working_dir"}}'
  exit 1
fi

USER="$(docker exec "$DB_CTR" printenv POSTGRES_USER 2>/dev/null || echo saleor)"
DBNAME="$(docker exec "$DB_CTR" printenv POSTGRES_DB 2>/dev/null || echo saleor)"
echo "db container=$DB_CTR user=$USER db=$DBNAME"

CHANNELS="$(docker exec "$DB_CTR" psql -U "$USER" -d "$DBNAME" -Atc 'SELECT slug FROM channel_channel ORDER BY 1;')"
echo "channels: $CHANNELS"
if ! grep -qx 'vspomni-site' <<<"$CHANNELS"; then
  echo "ERROR: channel vspomni-site not found — refusing dump (wrong DB)." >&2
  exit 1
fi
if grep -qx 'miraflores-site' <<<"$CHANNELS"; then
  echo "ERROR: this DB has miraflores-site — refusing dump." >&2
  exit 1
fi

INSIDE=/tmp/vspomni_dump_inside.sql
docker exec "$DB_CTR" pg_dump -U "$USER" -d "$DBNAME" --no-owner --no-acl -f "$INSIDE"
docker cp "$DB_CTR:$INSIDE" "/tmp/vspomni_saleor_${STAMP}.sql"

MEDIA_VOL=""
PROJ="$(docker inspect "$DB_CTR" --format '{{index .Config.Labels "com.docker.compose.project"}}')"
if [[ -n "$PROJ" ]]; then
  MEDIA_VOL="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJ" | grep media | head -1 || true)"
fi
if [[ -z "$MEDIA_VOL" ]]; then
  MEDIA_VOL="$(docker volume ls -q | grep -E 'vspomni.*media_files' | head -1 || true)"
fi
if [[ -z "$MEDIA_VOL" ]]; then
  echo "ERROR: media volume not found for project=$PROJ" >&2
  docker volume ls
  exit 1
fi
echo "media volume=$MEDIA_VOL"
tar -C "/var/lib/docker/volumes/${MEDIA_VOL}/_data" -czf "/tmp/vspomni_media_${STAMP}.tgz" .
ls -lh "/tmp/vspomni_saleor_${STAMP}.sql" "/tmp/vspomni_media_${STAMP}.tgz"
REMOTE

echo "==> scp SQL + media"
"${SCP[@]}" "$HOST:$REMOTE_SQL" "$OUT_SQL"
"${SCP[@]}" "$HOST:$REMOTE_MEDIA" "$OUT_MEDIA"
ls -lh "$OUT_SQL" "$OUT_MEDIA"
echo "OK. Next:"
echo "  ./scripts/etl/restore-saleor-dump.sh $OUT_SQL   # → vspomni_saleor_etl (NOT saleor_etl)"
echo "  ./scripts/etl/unpack-media.sh $OUT_MEDIA"
