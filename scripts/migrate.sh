#!/usr/bin/env bash
# Usage:
#   ./scripts/migrate.sh           # push pending migrations to linked Supabase project
#   ./scripts/migrate.sh --local   # apply migrations to local Docker DB (port 54322)
#   ./scripts/migrate.sh --list    # show migration status (local vs remote)
#   ./scripts/migrate.sh --new <name>  # create a new migration file

set -e

MODE="${1:-}"
NAME="${2:-}"

case "$MODE" in
  --local)
    echo "Applying pending migrations to local Docker DB..."
    PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres \
      -c "create table if not exists supabase_migrations.schema_migrations (version text primary key, name text, started_at timestamptz, inserted_at timestamptz not null default now());" 2>/dev/null || true

    for f in supabase/migrations/*.sql; do
      version=$(basename "$f" | cut -d_ -f1)
      already=$(PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -tAc \
        "select count(*) from supabase_migrations.schema_migrations where version='$version'" 2>/dev/null || echo "0")
      if [ "$already" = "0" ]; then
        echo "  Applying $(basename $f)..."
        PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f "$f"
        PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c \
          "insert into supabase_migrations.schema_migrations(version,name) values('$version','$(basename $f)')" 2>/dev/null || true
      fi
    done
    echo "Done."
    ;;

  --list)
    supabase migration list --linked
    ;;

  --new)
    if [ -z "$NAME" ]; then
      echo "Usage: ./scripts/migrate.sh --new <migration-name>"
      exit 1
    fi
    supabase migration new "$NAME"
    ;;

  "")
    echo "Pushing pending migrations to linked Supabase project..."
    echo "Y" | supabase db push --linked
    ;;

  *)
    echo "Unknown option: $MODE"
    echo "Usage: ./scripts/migrate.sh [--local | --list | --new <name>]"
    exit 1
    ;;
esac
