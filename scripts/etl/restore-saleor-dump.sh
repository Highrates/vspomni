#!/usr/bin/env bash
# Restore Vspomni Saleor dump into local Postgres DB vspomni_saleor_etl (ETL source).
#
# NEVER use saleor_etl — that DB is Miraflores. This script refuses that name.
#
#   ./scripts/etl/restore-saleor-dump.sh
#   ./scripts/etl/restore-saleor-dump.sh dumps/vspomni_saleor_2026-10-07.sql
#
# Env:
#   PGHOST (default localhost)  PGPORT (default 5432)
#   SALEOR_ETL_DB must be vspomni_saleor_etl (default); other values rejected
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DUMP="${1:-$ROOT/dumps/vspomni_saleor_2026-10-07.sql}"
HOST="${PGHOST:-localhost}"
PORT="${PGPORT:-5432}"
DB="${SALEOR_ETL_DB:-vspomni_saleor_etl}"

if [[ ! -f "$DUMP" ]]; then
  echo "Dump not found: $DUMP" >&2
  exit 1
fi

if [[ "$DB" == "saleor_etl" ]]; then
  echo "REFUSED: DB name 'saleor_etl' is Miraflores. Use vspomni_saleor_etl." >&2
  exit 1
fi
if [[ "$DB" != "vspomni_saleor_etl" ]]; then
  echo "REFUSED: expected SALEOR_ETL_DB=vspomni_saleor_etl, got '$DB'." >&2
  exit 1
fi

echo "==> restore $DUMP → ${HOST}:${PORT}/${DB} (role saleor)"
echo "    (will NOT touch saleor_etl / miraflores)"

psql -h "$HOST" -p "$PORT" -d postgres -v ON_ERROR_STOP=0 -c \
  "DO \$\$ BEGIN CREATE ROLE saleor LOGIN PASSWORD 'saleor'; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;"

dropdb -h "$HOST" -p "$PORT" --if-exists "$DB"
createdb -h "$HOST" -p "$PORT" -O saleor "$DB"
psql -h "$HOST" -p "$PORT" -d "$DB" -v ON_ERROR_STOP=0 -c \
  "CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;" || true

# PG16+ dump may contain \restrict — strip for restore
grep -vE '^\\restrict |^\\unrestrict ' "$DUMP" | psql -h "$HOST" -p "$PORT" -d "$DB" -v ON_ERROR_STOP=0

psql -h "$HOST" -p "$PORT" -d "$DB" -v ON_ERROR_STOP=0 -c "
  GRANT ALL ON SCHEMA public TO saleor;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO saleor;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO saleor;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO saleor;
"

echo "--- channels (must include vspomni-site, must NOT be only miraflores) ---"
CHANNELS="$(psql -h "$HOST" -p "$PORT" -d "$DB" -Atc 'SELECT slug FROM channel_channel ORDER BY 1;')"
echo "$CHANNELS"
if ! grep -qx 'vspomni-site' <<<"$CHANNELS"; then
  echo "ERROR: channel vspomni-site missing — wrong dump?" >&2
  exit 1
fi
if grep -qx 'miraflores-site' <<<"$CHANNELS"; then
  echo "ERROR: miraflores-site present — refusing to leave this as ETL source." >&2
  exit 1
fi

echo "--- counts ---"
psql -h "$HOST" -p "$PORT" -d "$DB" -c \
  "SELECT 'product' t, COUNT(*) n FROM product_product
   UNION ALL SELECT 'variant', COUNT(*) FROM product_productvariant
   UNION ALL SELECT 'user', COUNT(*) FROM account_user
   UNION ALL SELECT 'order', COUNT(*) FROM order_order
   UNION ALL SELECT 'page', COUNT(*) FROM page_page
   ORDER BY 1;"

echo "OK: $DB ready."
echo "SALEOR_DATABASE_URL=postgresql://saleor:saleor@${HOST}:${PORT}/${DB}"
echo "Do NOT point ETL at postgresql://…@localhost:5432/saleor_etl (Miraflores)."
