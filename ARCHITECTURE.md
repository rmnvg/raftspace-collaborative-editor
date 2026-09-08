# Architecture

## System components

```
┌─────────────────────┐        ┌──────────────────────────┐        ┌────────────────────┐
│  Browser (client)    │        │  Next.js server           │        │  Supabase Postgres  │
│                       │        │  (route handlers +        │        │                      │
│  Dashboard, editor,   │──────▶│  server components)       │──────▶│  app_users           │
│  dialogs — React      │  HTTP  │                            │ svc-role│  documents           │
│  client components    │◀──────│  services/*.ts             │◀──────│  document_shares     │
│                       │        │  (business logic)         │        │  (RLS on, no policies)│
└─────────────────────┘        └──────────────────────────┘        └────────────────────┘
```

- **Client components** (`src/components/*`, all marked `"use client"`)
  hold only UI state and call the app's own `/api/*` routes with `fetch`.
  None of them import Supabase or anything holding the service-role key.
- **Route handlers** (`src/app/api/**/route.ts`) are thin: validate input
  with Zod, resolve the acting user from the session cookie, call a
  service function, map the result to an HTTP status and a `{ error }` or
  `{ ...payload }` JSON body.
- **Services** (`src/services/*.ts`) hold the actual business logic and are
  the only code that talks to Supabase, via a single service-role client
  (`src/lib/supabase/admin.ts`).
- **Pure logic** (`src/lib/permissions.ts`, `src/lib/sharing-rules.ts`,
  `src/validation/*.ts`) has no I/O and is unit-tested directly with
  Vitest — these are the modules that encode the actual authorization and
  validation *rules*, independent of how they're wired into a route.

## Request / data flow

A typical mutating request (e.g. saving an edit):

1. Client debounces the edit, then `PATCH /api/documents/[id]` with
   `{ title?, content? }`.
2. The route validates the body against `updateDocumentSchema` (Zod) — an
   invalid payload never reaches the database layer.
3. The route resolves the acting user id from the `draftspace_demo_user`
   cookie via `getCurrentUserId()` — never from the request body.
4. `findAccessibleDocument()` loads the document and, if the caller isn't
   the owner, the caller's specific share row. If neither exists, the
   route returns 404 — the same response whether the document doesn't
   exist or the caller simply has no relationship to it.
5. The pure `canEdit()` helper decides whether the update is allowed given
   the loaded document + share record.
6. If allowed, `updateDocumentFields()` issues the actual Postgres update
   through the service-role client and returns the fresh row.

Every document- and sharing-mutating route follows this same shape:
validate → resolve identity → load + check access → apply a pure rule →
mutate → respond.

## Database model

Three tables (`supabase/migrations/20260908010000_init.sql`):

- **`app_users`** — the three seeded demo users (`id`, `name`, unique
  `email`, `avatar_color`, `created_at`).
- **`documents`** — `id`, `title` (1–200 chars), `content` (`jsonb`,
  defaulting to a minimal valid empty Tiptap doc), `owner_id` (FK →
  `app_users`, cascade delete), `created_at`, `updated_at` (kept current by
  a `BEFORE UPDATE` trigger).
- **`document_shares`** — composite primary key `(document_id, user_id)`,
  `permission` constrained to `'editor'` today (the column exists so a
  future viewer-only tier doesn't require a schema migration), FKs to both
  `documents` and `app_users` with cascade delete.

Indexes: `documents.owner_id` (owned-by-me lookups) and
`document_shares.user_id` (shared-with-me lookups — the composite primary
key alone only serves lookups keyed by `document_id`).

## Demo-session design

There's no real authentication. `src/services/session.ts` resolves the
acting user for every request:

1. Read the `draftspace_demo_user` cookie (`httpOnly`, `SameSite=Lax`).
2. If it names a real seeded user, use that user.
3. Otherwise, fall back to the documented default (Ramanjot Singh), or the
   first seeded user if that name doesn't exist.

`POST /api/session` is the only way to change the cookie, and it validates
the submitted id against the actual `app_users` table before trusting it —
**a request body is never treated as proof of identity** for anything.
Every other route re-derives identity from the cookie independently; the
cookie is the only source of truth for "who is asking."

## Server-side authorization

Three pure functions (`src/lib/permissions.ts`) encode every access rule
in the app, and nothing else does:

```ts
canRead(document, userId, shares)          // owner, or has a share row
canEdit(document, userId, shares)          // same as canRead today —
                                            // only "editor" shares exist
canManageSharing(document, userId)         // owner only
```

Every document and sharing route calls these before doing anything
state-changing. Because they're pure (no I/O), they're exhaustively unit
tested (`permissions.test.ts`, `sharing-rules.test.ts`) without touching a
database, and the routes can't drift from the tested behavior since they
call the exact same functions.

Two authorization outcomes are deliberately different:

- **No relationship to the document at all** → 404, identical to "doesn't
  exist". This is what stops a URL guess (or a malicious/unrelated user)
  from even confirming a document exists.
- **Has a relationship but lacks a specific permission** (e.g. a shared
  editor trying to manage sharing or delete) → 403, with a clear message.
  They're a legitimate user of the document, just not authorized for that
  particular action.

## Rich-text persistence

The editor (`src/components/RichTextEditor.tsx`) is Tiptap with a fixed
extension set — `StarterKit.configure({ heading: { levels: [1, 2] } })`
plus `Underline` — defined once in `src/lib/tiptap-extensions.ts` and
reused by both the live editor and the server-side Markdown importer, so
imported content can never contain a node/mark type the editor doesn't
know how to render.

Content round-trips as Tiptap's native JSON (`editor.getJSON()` /
`content` prop), stored directly in the `documents.content jsonb` column —
no serialization format conversion on save or load, so nothing is lost
between edits.

## Autosave behavior

`DocumentEditorClient` tracks dirty state in refs (not React state) to
avoid stale closures in the debounce timer:

- Any title keystroke or Tiptap `onUpdate` marks the document dirty and
  (re)starts an 800ms timer.
- When the timer fires, if nothing is currently saving, it `PATCH`es the
  latest title + content in one request (title and content are always
  saved together, not as separate requests).
- If new edits land *while* a save is in flight, the in-flight request is
  left alone; on completion the code checks whether it's still dirty and,
  if so, immediately schedules another save — this avoids overlapping
  requests without ever silently dropping a burst of fast edits.
- Four visible states — Unsaved, Saving…, Saved, Save failed — with a
  Retry action on failure that re-attempts immediately, bypassing the
  debounce.
- The very first `content`/`title` set (from the initial fetch) never
  marks the document dirty, since React state is initialized directly
  from the fetched document rather than set afterward — so opening a
  document never fires a spurious autosave.
- `beforeunload` warns before closing/reloading the tab while unsaved.
  Since that event never fires for client-side navigation (e.g. clicking
  "Back to documents" mid-debounce), the component's unmount/param-change
  cleanup also flushes any pending edit via a `fetch(..., { keepalive:
  true })` request, which the browser keeps alive past the unmount.

## File-import pipeline

`POST /api/documents/import` (multipart form data):

1. Validate the file exists, its extension is `.txt` or `.md`, and its
   size is between 1 byte and 1 MB (`validateImportFile`, Zod-backed) —
   before any content is read.
2. Read the file as text.
3. Convert to Tiptap JSON:
   - **`.txt`**: blank lines split paragraphs; single newlines within a
     paragraph become `hardBreak` nodes. No formatting is invented.
   - **`.md`**: `marked` parses Markdown to HTML, then `@tiptap/html`'s
     `generateJSON()` parses that HTML into Tiptap JSON using the exact
     same extension list as the live editor. `generateJSON` only emits
     node/mark types the given extensions define, so anything unsupported
     (images, tables, raw HTML, footnotes, …) is silently dropped rather
     than crashing or producing content the editor can't render. This is
     why no separate sanitizer or hand-rolled Markdown→Tiptap transformer
     was needed.
4. Derive the initial title from the filename (extension stripped, then
   validated through the same `documentTitleSchema` every other title
   goes through).
5. Create the document via the same service function normal document
   creation uses, owned by the current session user.

Every step returns a specific, friendly 400 on failure (unsupported type,
empty file, oversized file, unreadable/unparseable content); a genuine
database failure returns a generic 500 with the real error only logged
server-side.

## Security decisions

- **The service-role Supabase client is the only thing that talks to the
  database**, and it lives in one module, `src/lib/supabase/admin.ts`,
  guarded by the `server-only` package (which throws a build error if
  ever imported into client-bundled code). Every service file that uses
  it also imports `server-only` directly. No `NEXT_PUBLIC_`-prefixed
  variable resolves to the service-role key — `src/lib/env.ts` validates
  the three Supabase env vars with Zod and throws a helpful, non-secret
  error listing exactly which are missing if misconfigured.
- **RLS is enabled on all three tables with zero policies.** This is
  deliberate and matters even though the app never issues an
  authenticated user-scoped Supabase query: with RLS on and no policies,
  Postgres denies *all* access to the `anon`/`authenticated` roles by
  default, and only the service role (which bypasses RLS entirely) can
  read or write. In other words, if the anon/public key were ever leaked,
  or if a future contributor added a client-side Supabase call without
  realizing the security model, the database itself would refuse the
  request rather than silently allowing it. **This is defense in depth,
  not the primary authorization mechanism** — the primary mechanism is
  the `canRead`/`canEdit`/`canManageSharing` checks enforced in the
  service/route layer described above, which apply business rules
  (ownership, sharing) that RLS row-security policies alone can't easily
  express without duplicating the same logic in SQL. Both layers exist on
  purpose: the application layer is where "can Maya edit this specific
  document" is decided, and RLS is the backstop that keeps the database
  from being reachable any other way.
- **Every request body is Zod-validated** before touching a service
  function; unknown fields are stripped by Zod's default object mode, so
  a client can't smuggle e.g. `owner_id` into a `PATCH` body.
- **Identity never comes from the request body.** `getCurrentUserId()`
  always reads the `httpOnly` cookie and re-validates it against the
  database; `POST /api/session` validates a submitted id the same way
  before ever setting that cookie.
- **Errors are split into two shapes.** Validation/authorization failures
  (400/403/404/409) return their real, specific, user-facing message.
  Anything else (`internalError` in `src/lib/http.ts`) is logged
  server-side with context and returns a generic "Something went wrong"
  to the client — so a Supabase/Postgres error never leaks connection
  details, table names, or internal hints to the browser.

## Deliberate scope cuts

- No real-time collaboration/CRDT — out of scope per the assignment; the
  data model (single JSON blob per document) would need to change
  substantially to support it.
- No production OAuth — simulated session only, as specified.
- No AI writing features, comments, folders, DOCX import, or image
  attachments — explicitly excluded.
- Single "editor" sharing tier — the schema leaves room for a "viewer"
  tier, but the UI, permission checks, and tests only implement editor.
- Document deletion is implemented and authorized server-side but has no
  UI entry point (optional per the original spec).

## What would be built with another 2–4 hours

1. **A viewer-only sharing tier** — the `permission` column and
   `canRead`/`canEdit` split already anticipate this; it mainly needs a
   second CHECK constraint value, a UI toggle in the share dialog, and a
   couple of new permission tests.
2. **A delete-document UI** with a confirmation dialog — the backend
   route and authorization already exist and are tested.
3. **A committed Playwright suite** covering the full manual flows this
   submission verified by hand (create → format → save → refresh →
   import → share → switch user → edit shared doc → revoke), so CI can
   catch a regression instead of relying on manual verification.
4. **Optimistic concurrency on save** — right now a save is last-write-
   wins; a `updated_at` precondition check (send the last-known
   `updated_at`, reject with 409 if it's moved) would surface "someone
   else edited this" instead of silently overwriting.
5. **Rate limiting** on the import and share-grant endpoints, since
   they're the two write paths that accept relatively unconstrained
   client input.
