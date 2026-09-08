# AI Workflow

## A correction, up front

The submission template this document is meant to follow assumes a
specific split: "Claude for planning/docs, Codex for implementation."
That is not what happened on this project, and this document should not
pretend otherwise. `NOTES.md` — intended as the running, human-maintained
log this file would normally be built from — was created but never
populated during the build. So instead of reconstructing a workflow from
notes that don't exist, this document describes, as accurately as
possible, what actually happened: a **single AI agent, Claude Code
(Sonnet 5), did the planning, implementation, testing, and manual
verification**, across ten sequential prompts in one continuous session,
with the human (Ramanjot) directing scope, sequencing, and review at each
step. No separate Codex session or tool was used anywhere in this build.

## Division of labor

- **Human**: wrote all ten prompts, in order, each building on the last;
  made the scope calls stated up front in the assignment (no real-time
  collab, no OAuth, no AI writing features, simulated auth); reviewed
  each prompt's output before issuing the next one.
- **AI (this agent)**: proposed and implemented the concrete architecture
  within those constraints — folder structure, database schema, API
  surface, permission model, editor integration, autosave design, import
  pipeline, sharing rules — wrote all application code and tests, ran and
  fixed every quality check, and performed manual end-to-end verification
  against a real (locally-run) Supabase instance and a real headless
  browser rather than asserting things worked from reading the code.

## Where AI accelerated the build

- **Boilerplate that has one obviously-correct shape**: Next.js App
  Router scaffolding, Zod schemas mirroring the database constraints,
  the repeated validate → resolve-identity → check-access → mutate →
  respond pattern across every document/sharing route, Tailwind styling
  for loading/error/empty states.
- **Cross-cutting consistency**: keeping the Tiptap extension list
  identical between the live editor and the server-side Markdown importer
  (`src/lib/tiptap-extensions.ts`) so imported content can never contain a
  node type the editor doesn't render — the kind of thing that's easy to
  keep in sync when one agent writes both call sites in the same session.
- **Test writing**: once a pure function's contract was decided
  (`canRead`/`canEdit`/`canManageSharing`, `validateShareGrant`,
  `validateImportFile`), writing the matching Vitest cases for the
  boundary conditions (owner vs. shared vs. unrelated user, exactly-at-
  the-limit file sizes, duplicate shares, removal revoking access) was
  fast and consistent because the same agent had just written the
  function.

## What was generated, then changed or rejected

Specific instances from this build, not a generic list:

1. **PostgREST ambiguous-embed error.** The first version of the
   owner-embed query (`owner:app_users(*)`) looked correct and passed
   `tsc`/lint/build. It failed the first time it actually ran against
   Postgres via PostgREST, with "more than one relationship was found for
   'documents' and 'app_users'" — because `document_shares` gives
   PostgREST an *implicit* many-to-many path between the two tables in
   addition to the direct FK. This was only caught by spinning up a real
   local Supabase instance and hitting the route with `curl`; it was
   fixed by naming the FK constraint explicitly
   (`owner:app_users!documents_owner_id_fkey(*)`) everywhere the same
   pattern was used.
2. **Toolbar buttons silently eating typed content.** The first
   `RichTextEditor` toolbar called `editor.chain().focus().toggleBold()`
   etc. on click, which looks like the standard Tiptap pattern. In an
   actual browser, clicking a `<button>` moves DOM focus to that button
   *before* the React click handler runs, and the editor's `.focus()`
   call didn't reliably win that race — so formatting commands fired
   against a de-focused editor and subsequent keystrokes were dropped
   entirely. This was caught by driving the real UI with Playwright and
   noticing typed text never appeared, not by reading the code. Fixed
   with `onMouseDown={(e) => e.preventDefault()}` on every toolbar
   button, the standard fix for this exact class of bug.
3. **A `loading.tsx` that quietly broke HTTP status codes.** An early
   root-level `loading.tsx` (added when the dashboard was still
   server-rendered) kept wrapping *every* route — including
   `/documents/[id]` — in a Suspense boundary after the dashboard became
   fully client-rendered and no longer needed it. That meant a 200 status
   was flushed to the client before an async page component's
   `notFound()` or thrown error could take effect, so a malformed or
   inaccessible document id returned HTTP 200 with "not found" *content*
   instead of an actual 404/500. Caught with `curl -w "%{http_code}"`
   against a production build, not by inspection. Fixed by deleting the
   now-unnecessary file.
4. **A pinned dependency with a known CVE.** The initial scaffold pinned
   `next@14.2.16` per the "pin 14.2.x, not a newer major" instruction;
   `npm install` flagged it as having a disclosed security advisory.
   Bumped to `14.2.35` — still 14.2.x, same major/minor constraint the
   assignment asked for, just the latest patch — rather than either
   ignoring the warning or jumping to a newer major.
5. **A false-positive in my own verification script**, not the app: an
   early Playwright check used `page.waitForSelector("text=Saved")` to
   confirm autosave completed. That locator substring-matches "**Un**-
   saved changes" too, so it resolved immediately and the script moved on
   (and reloaded the page) *before* the real debounced save had actually
   fired — which briefly looked like a real autosave bug ("content isn't
   persisting") until tracing the actual network requests showed zero
   `PATCH` calls had been made yet. The fix was to correct the test
   assertion to an exact match, not to touch the application code, which
   was working correctly the whole time. This is called out here because
   it's a good example of why "the AI said it verified something" isn't
   sufficient on its own — the verification method itself has to be
   checked too.
6. **Issues found in the deliberate Prompt 8 security/quality pass**
   (not bugs introduced and caught in the same breath — a dedicated
   review after the feature work was "done"):
   - `GET /api/session`'s error handler returned a thrown error's raw
     `.message` directly to the client, unlike every other route, which
     logs the real error server-side and returns a generic message. This
     could have leaked raw Supabase/Postgres error text on an infra
     failure. Fixed to match the rest of the app's `internalError`
     pattern.
   - Autosave's `beforeunload` guard only covers a full page
     unload/reload — it never fires for Next.js client-side navigation.
     Clicking "Back to documents" mid-debounce would silently drop the
     last edit with no warning at all. Fixed by flushing a
     `fetch(..., { keepalive: true })` request in the component's
     unmount/param-change cleanup.
   - On a 375px mobile viewport, the document title input clipped
     mid-word instead of wrapping, because the title/badge/Share-button
     row only used `flex-wrap` with an input allowed to shrink to zero
     width rather than wrap. Caught with an actual mobile-viewport
     screenshot, not by reading the Tailwind classes. Fixed by switching
     that row to stack vertically below the `sm` breakpoint.
   - The import dialog's file input was visually hidden (`sr-only`) with
     no visible focus ring on its label, so a sighted keyboard user
     tabbing to it couldn't see where focus landed. Fixed with a
     `has-[:focus-visible]` ring on the label.

## How correctness, UX, security, and reliability were verified

Nothing in this project was declared "done" from reading the code alone:

- **Every prompt ended with `tsc --noEmit`, `next lint`, `vitest run`,
  and `next build` actually run**, not assumed — and every failure was
  fixed before moving on.
- **Anything touching Supabase was exercised against a real database.**
  `npx supabase start` (Docker) ran the actual committed migration and
  seed, and every new backend route was hit with real `curl` requests —
  including the exact authorization edge cases the spec called out
  (self-share, duplicate share, unrelated user, shared editor attempting
  an owner-only action) — with the real HTTP status and JSON body
  inspected, not inferred.
- **UI flows were driven with a real headless browser** (Playwright,
  installed ad hoc for verification — not part of the committed test
  suite) at both desktop and mobile viewport sizes: create → format →
  save → refresh → import → share → switch user → edit shared document →
  revoke access, screenshotted at each step, with the browser console
  checked for errors and hydration warnings after every prompt.
- **Security-specific checks were run explicitly, not assumed**: after
  every prompt touching Supabase, the production client bundle
  (`.next/static`) was `grep`ped for the service-role key and for the
  admin client's import path, and a `git grep` secret scan confirmed
  nothing beyond `.env.example`'s empty placeholders is tracked.
- **All test/local-infrastructure artifacts were torn down** after each
  verification pass (Docker containers stopped, ad hoc Playwright driver
  scripts deleted, `node_modules` reset to match `package-lock.json`) so
  they wouldn't linger in the repository or the environment.

## AI supported judgment; it didn't replace it

Every non-trivial tradeoff in this build was made and stated explicitly,
not defaulted to silently: 404-vs-403 for different authorization
failures (and why), 409-vs-idempotent-200 for duplicate shares, keeping
the DB unique-constraint as a race-condition backstop *in addition to* an
application-level pre-check rather than relying on either alone,
`.txt`/`.md`-only import instead of a general document converter, a
single "editor" sharing tier instead of read/write from day one. These
were framed as decisions with reasoning, for the human directing the
session to accept, redirect, or override — the six real bugs listed above
were only caught because each implementation was actually run and probed
rather than trusted on inspection, and the fixes were verified the same
way before being called complete.
