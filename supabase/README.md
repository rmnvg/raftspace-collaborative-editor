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
