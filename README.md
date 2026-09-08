# DraftSpace

A lightweight collaborative rich-text document editor. Create documents,
format them with a Tiptap-based editor, import `.txt`/`.md` files, and share
documents with other seeded demo users — all with server-enforced
authorization on top of Supabase Postgres.

**Live URL:** https://raftspace-collaborative-editor.vercel.app

## Features

- Create, rename, edit, save, and reopen documents.
- Rich text editing: paragraphs, H1/H2, bold, italic, underline, bulleted
  and numbered lists, undo/redo.
- Import `.txt` and `.md` files as new editable documents (see
  [Import types](#supported-import-types) below).
- Three seeded demo users with a one-click switcher (no real auth).
- Owners can share a document with another seeded user (editor access);
  owners can revoke access at any time.
- Dashboard clearly separates **Owned by me** from **Shared with me**.
- Debounced autosave (~800ms) with visible Unsaved / Saving… / Saved / Save
  failed states and retry on failure.
- All formatting and sharing data is persisted in Supabase Postgres.
- Every document/sharing action is authorized on the server, independent of
  what the UI shows or hides.
- Responsive layout (desktop and mobile) with keyboard-accessible controls.

## Technology stack

- **Next.js 14.2.x** (App Router), pinned — not a newer major version
- **TypeScript**, strict mode
- **Tailwind CSS**
- **Tiptap** (`@tiptap/react` + `starter-kit` + `extension-underline`) for
  the editor; `@tiptap/html` + `marked` for Markdown import
- **Supabase** (Postgres), accessed only from server-side code via the
  service-role client
- **Zod** for request/input validation
- **Vitest** for automated tests
- Deployable to **Vercel**

## Demo users

DraftSpace uses simulated authentication: no passwords, no OAuth. A header
switcher lets you act as any of three seeded users. Authorization is still
enforced on the server for every request — the switcher only changes which
user the *server* believes is making the request (via an `httpOnly` cookie),
it never grants access itself.

| User | Email |
|---|---|
| Ramanjot Singh (default) | ramanjot@draftspace.dev |
| Maya Chen | maya@draftspace.dev |
| Alex Morgan | alex@draftspace.dev |

If no session cookie is present, the app defaults to **Ramanjot Singh**.

## Local setup

### Prerequisites

- Node.js 18.18+ (developed and tested on Node 26)
- npm
- A Supabase project (hosted, or the Supabase CLI for local development —
  either works)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

**Option A — hosted Supabase project:**

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migration in `supabase/migrations/20260908010000_init.sql`
   (creates the schema, enables RLS, seeds the three demo users). Either
   paste it into the SQL editor, or:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. Copy your project's URL, anon key, and service role key from
   Project Settings → API.

**Option B — local Supabase (Docker required):**

```bash
npx supabase start
```

This applies the migration automatically and prints a local URL, anon key,
and service role key.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the three values from step 2:

| Variable | Exposed to client? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (part of the standard Supabase env contract; this app does not currently issue any client-side Supabase queries — see `ARCHITECTURE.md`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **No — server only** | Used exclusively by server-side code (`src/lib/supabase/admin.ts`) to read/write the database. Never prefix this with `NEXT_PUBLIC_`. |

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | `tsc --noEmit` |

## Supported import types

- `.txt` — plain text. Blank-line-separated paragraphs are preserved;
  single line breaks within a paragraph become hard breaks.
- `.md` — Markdown, converted to HTML with `marked`, then to Tiptap JSON
  with `@tiptap/html`'s `generateJSON()` using the same extension set as
  the live editor. Anything the editor's schema doesn't support (images,
  tables, etc.) is dropped automatically rather than breaking the import.
- **1 MB maximum**, one file per import.
- Rejected uploads (wrong extension, empty file, oversized file, unreadable
  content) return a specific, friendly error and the import dialog stays
  open for another try.

## Reviewer walkthrough: sharing

1. As **Ramanjot Singh** (default), click **New document**, give it a
   title, add some formatting, and wait for the status to read "Saved".
2. Click **Share** (top right of the editor, owner-only), pick **Maya
   Chen**, and click **Share**. She now appears under "People with
   access".
3. Switch the header dropdown to **Maya Chen**. The document appears under
   **Shared with me** with a "Shared" badge and Ramanjot's name as owner.
4. Open it — Maya sees an **Editor** badge (not Owner) and no Share button.
   Edit the content; it autosaves.
5. Switch back to **Ramanjot Singh** and reopen the document — Maya's edit
   is there.
6. Open **Share** again, click **Remove** next to Maya Chen, confirm.
7. Switch to **Maya Chen** — the document no longer appears anywhere for
   her, and opening its old URL directly returns a "not found" state (the
   API intentionally doesn't distinguish "doesn't exist" from "you don't
   have access", so it can't be used to probe for documents by URL).

## Deploying to Vercel

The app is a standard Next.js 14 App Router project — no `vercel.json` or
special config is needed; Vercel auto-detects the framework and build
command.

1. **Set up a hosted Supabase project** (if you haven't already — the
   local Docker instance used during development isn't reachable from
   Vercel). Create one at [supabase.com](https://supabase.com), then
   apply the migration:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   or paste `supabase/migrations/20260908010000_init.sql` into the
   Supabase SQL editor directly. Either way, confirm the three demo users
   exist afterward (Table Editor → `app_users`, or `select * from
   app_users;` in the SQL editor).
2. **Import the repo into Vercel** (vercel.com → Add New → Project → your
   GitHub repo), or deploy from the CLI:
   ```bash
   npx vercel login
   npx vercel link
   npx vercel --prod
   ```
3. **Set environment variables** in the Vercel project (Settings →
   Environment Variables), using the values from your Supabase project's
   Settings → API page:

   | Name | Value source | Exposed to client? |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Yes |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key | Yes |
   | `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | **No** — do not prefix with `NEXT_PUBLIC_` |

   Set all three for the Production environment (and Preview, if you want
   preview deployments to work against the same project).
4. **Redeploy** after setting the env vars if the first deploy ran before
   they were set.
5. **Verify**: open the deployed URL, confirm the three demo users appear
   in the switcher, create a document, and confirm it persists after a
   refresh. This confirms the deployed app can actually reach Supabase.

## Known limitations

- No real-time collaboration or CRDT — this is a single-editor-at-a-time
  app; concurrent edits from two sessions are last-write-wins.
- No production OAuth — authentication is simulated via a cookie-selected
  demo user, by design for this exercise.
- No AI writing features, comments, folders, DOCX import, or image
  attachments — explicitly out of scope.
- Sharing supports a single "editor" permission tier; there's no read-only
  viewer role yet (the schema's `permission` column is designed to extend
  to one later).
- A document-delete endpoint exists and is fully authorized server-side,
  but there's no delete button in the UI yet.
- No committed browser-automation (Playwright/Cypress) test suite; the
  automated tests are Vitest unit tests covering validation, permissions,
  and file-conversion logic. End-to-end flows (including the sharing
  walkthrough above) were verified manually against a real local Supabase
  instance during development — see `AI_WORKFLOW.md` for how.

See `ARCHITECTURE.md` for the reasoning behind these cuts and what a
follow-up pass would prioritize.
