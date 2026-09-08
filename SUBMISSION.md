# Submission

- **Source repository:** https://github.com/rmnvg/raftspace-collaborative-editor
- **Live product URL:** _not yet deployed — TODO. See "Deploying to Vercel" in `README.md` for exact steps (requires a hosted Supabase project and an authenticated Vercel account, neither available in the dev environment this was built in)._
- **Video URL:** _TODO — see `VIDEO_URL.txt`_

## Demo users

| User | Email |
|---|---|
| Ramanjot Singh (default) | ramanjot@draftspace.dev |
| Maya Chen | maya@draftspace.dev |
| Alex Morgan | alex@draftspace.dev |

No passwords — switch users from the header dropdown. See `README.md` for
the full local-setup steps (Supabase migration, env vars, install/run).

## Working functionality

- Create, rename, edit, save, and reopen documents.
- Rich text: paragraphs, H1/H2, bold, italic, underline, bulleted and
  numbered lists, undo/redo.
- Import `.txt` and `.md` (1 MB limit, one file per import) as a new
  editable document, title derived from the filename.
- Three seeded demo users with a header switcher.
- Owner-only sharing: grant a seeded user editor access, view current
  collaborators, revoke access — all authorized server-side regardless of
  what the UI shows.
- Dashboard separates "Owned by me" from "Shared with me"; shared cards
  show the owner's name.
- Debounced (~800ms) autosave with Unsaved / Saving… / Saved / Save failed
  states and a retry action.
- Loading, error (with retry), empty, not-found/forbidden states across
  the dashboard, editor, import dialog, and share dialog.
- Responsive desktop/mobile layout; keyboard-accessible controls
  (native `<dialog>` modals, labeled inputs, focus-visible rings).

## Incomplete / out of scope

- No real-time collaboration or CRDT (by design — see assignment scope).
- No production OAuth (simulated session, by design).
- No AI writing features, comments, folders, DOCX import, or image
  attachments (explicitly excluded).
- Only one sharing permission tier ("editor") — no read-only viewer role.
- A document-delete API route exists and is fully authorized, but has no
  delete button in the UI.
- No committed browser-automation (Playwright/Cypress) test suite —
  end-to-end flows were verified manually during development (see
  `AI_WORKFLOW.md`), not re-runnable in CI yet.

Full reasoning for these cuts is in `ARCHITECTURE.md`.

## Verification commands and actual results

Run from a clean `npm install`, against the repository as committed:

```
$ npm run typecheck
> tsc --noEmit
(no output — 0 errors)

$ npm run lint
> next lint
✔ No ESLint warnings or errors

$ npm test
> vitest run
 ✓ src/lib/utils.test.ts (2 tests)
 ✓ src/lib/permissions.test.ts (4 tests)
 ✓ src/lib/sharing-rules.test.ts (7 tests)
 ✓ src/validation/documents.test.ts (14 tests)
 ✓ src/validation/import.test.ts (15 tests)
 ✓ src/lib/format.test.ts (7 tests)
 ✓ src/lib/import.test.ts (11 tests)
 Test Files  7 passed (7)
      Tests  60 passed (60)

$ npm run build
> next build
✓ Compiled successfully
✓ Generating static pages (7/7)
Route (app)                              Size     First Load JS
┌ ○ /                                    17.6 kB         114 kB
├ ○ /_not-found                          875 B          88.2 kB
├ ƒ /api/documents                       0 B                0 B
├ ƒ /api/documents/[id]                  0 B                0 B
├ ƒ /api/documents/[id]/shares           0 B                0 B
├ ƒ /api/documents/[id]/shares/[userId]  0 B                0 B
├ ƒ /api/documents/import                0 B                0 B
├ ƒ /api/session                         0 B                0 B
└ ƒ /documents/[id]                      99.1 kB         196 kB
```

`npm run build` requires `.env.local` with valid Supabase credentials to
be present (see `README.md`) — the API routes are correctly marked dynamic
(ƒ) so the build itself doesn't need a live database, but `next build`
does read env files if present.

Beyond these automated checks, the full flow below was verified manually
against a real local Supabase instance and a real browser (not simulated
or assumed) during development — see `AI_WORKFLOW.md` for how.

## Quick reviewer flow

1. `npm install`, set up Supabase and `.env.local` per `README.md`,
   `npm run dev`.
2. As **Ramanjot Singh** (default), click **New document**, add a
   heading, some bold text, and a list. Watch the status settle to
   "Saved".
3. Refresh the page — title and formatting are unchanged.
4. Click **Import file**, import a `.md` file — it opens straight into
   the editor with converted formatting.
5. Click **Share**, add **Maya Chen**.
6. Switch to **Maya Chen** (header dropdown) — the document is under
   "Shared with me" with an "Editor" badge and no Share button. Edit it.
7. Switch back to **Ramanjot Singh** — Maya's edit is there. Open
   **Share**, remove Maya.
8. Switch to **Maya Chen** again — the document is gone from her view.
