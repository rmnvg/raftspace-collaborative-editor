-- DraftSpace initial schema: demo users, documents, and sharing.
-- Idempotent: safe to re-run against the same database.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- app_users
-- ---------------------------------------------------------------------------
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null unique check (char_length(email) between 3 and 255),
  avatar_color text not null check (avatar_color ~* '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  -- A valid empty Tiptap/ProseMirror document: a doc node needs at least one
  -- block child, so an empty paragraph is the minimal valid empty document.
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  owner_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_owner_id on documents(owner_id);

-- ---------------------------------------------------------------------------
-- document_shares
-- ---------------------------------------------------------------------------
create table if not exists document_shares (
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  -- Only "editor" exists today; the CHECK constraint documents the
  -- restriction explicitly rather than leaving it implicit.
  permission text not null default 'editor' check (permission in ('editor')),
  created_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

-- The primary key covers lookups by document_id; shared-with-me queries key
-- off user_id alone, so it needs its own index.
create index if not exists idx_document_shares_user_id on document_shares(user_id);

-- ---------------------------------------------------------------------------
-- updated_at mechanism
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on documents;
create trigger documents_set_updated_at
  before update on documents
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- RLS is enabled with NO policies on every table. With RLS on and zero
-- policies, Postgres denies all access to any role subject to RLS (i.e. the
-- anon/authenticated keys) — only the Supabase service role, which bypasses
-- RLS, can read or write. The service role key lives only in server-side
-- Next.js code, so this is how "database calls go through the server" is
-- enforced at the database layer, not just by convention.
-- ---------------------------------------------------------------------------
alter table app_users enable row level security;
alter table documents enable row level security;
alter table document_shares enable row level security;

-- ---------------------------------------------------------------------------
-- Seed: deterministic demo users
-- Fixed UUIDs so the app, tests, and any manual psql session can all refer
-- to the same three users without re-querying for their ids.
-- ---------------------------------------------------------------------------
insert into app_users (id, name, email, avatar_color, created_at)
values
  ('11111111-1111-1111-1111-111111111111', 'Ramanjot Singh', 'ramanjot@draftspace.dev', '#4F46E5', '2026-01-01T00:00:00Z'),
  ('22222222-2222-2222-2222-222222222222', 'Maya Chen',      'maya@draftspace.dev',      '#059669', '2026-01-01T00:00:01Z'),
  ('33333333-3333-3333-3333-333333333333', 'Alex Morgan',    'alex@draftspace.dev',      '#DB2777', '2026-01-01T00:00:02Z')
on conflict (email) do nothing;
