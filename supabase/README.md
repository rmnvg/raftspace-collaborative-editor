# Supabase schema

`migrations/20260908010000_init.sql` creates `app_users`, `documents`, and
`document_shares`, enables RLS with no policies (service-role only access),
and seeds the three deterministic demo users.

## Applying it

With the Supabase CLI, from the project root:

```
supabase link --project-ref <your-project-ref>
supabase db push
```

Or directly with `psql` against your project's connection string:

```
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260908010000_init.sql
```

The migration is idempotent (`create table if not exists`, `on conflict do
nothing`) so it's safe to re-run.

## Local development

`config.toml` lets you run the whole stack locally with Docker, no hosted
project required:

```
npx supabase start
```

This applies the migration automatically and prints a local URL, anon key,
and service role key — copy those into `.env.local` (see `.env.example`).
Stop the stack with `npx supabase stop`.
