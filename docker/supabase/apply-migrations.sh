#!/bin/sh
set -eu

: "${POSTGRES_HOST:=db}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DB:=postgres}"
: "${POSTGRES_USER:=postgres}"
: "${SUPABASE_ADMIN_USER:=supabase_admin}"
: "${SUPABASE_ADMIN_PASSWORD:=postgres}"

until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  sleep 1
done

PGPASSWORD="$SUPABASE_ADMIN_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$SUPABASE_ADMIN_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "alter role supabase_auth_admin with password 'postgres';"

if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'docker_schema_migrations');" | grep -q t; then
  echo "Database schema already initialized; skipping migrations."
  exit 0
fi

{
  for migration in /migrations/*.sql; do
    printf '%s\n' "\\echo Applying $migration"
    cat "$migration"
    printf "\n"
  done
  printf '%s\n' "\\echo Applying seed"
  cat /seed.sql
  printf "\n"
  printf "create table public.docker_schema_migrations (id integer primary key, applied_at timestamptz not null default now());\n"
  printf "insert into public.docker_schema_migrations (id) values (1);\n"
} | psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1
