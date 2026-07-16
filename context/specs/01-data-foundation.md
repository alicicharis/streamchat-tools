# Data Foundation

## Why

**PRD feature:** Feature 1: Data foundation - see `context/prd.md`

Every other feature (streaming chat, thread management, tools, cost counter) persists to or reads from local SQLite. This lands the schema, client, query layer, and the project's test runner before any of them start.

## What

- Drizzle schema for `threads` and `messages` (cascade delete, JSON parts column, model + token usage columns).
- better-sqlite3 singleton client + drizzle instance.
- Raw-query layer: `src/db/queries/threads.ts` and `src/db/queries/messages.ts`.
- `drizzle.config.ts` + npm scripts for `drizzle-kit push` / `generate`.
- Vitest installed and configured (first feature, so the runner lands here) with unit tests for the query functions against a temp SQLite file.

Done when `npm run db:push` creates the schema from a clean checkout, `npm test` passes, and no DB access exists outside `src/db/`.

## Context

**Relevant files:**

- `package.json` - add deps + `db:push`, `db:generate`, `test` scripts. No drizzle/vitest installed yet; project is a fresh Next.js 16 scaffold.
- `.gitignore` - add the SQLite files (`local.db` and its `-journal`/`-wal`/`-shm` siblings).
- `tsconfig.json` - `@/*` path alias exists; use it in imports.
- `context/prd.md` - Feature 1 section is the source of truth for columns and function names.

**Patterns to follow:**

- CLAUDE.md: DB types inferred via `typeof table.$inferSelect` / `$inferInsert`, never written manually.
- CLAUDE.md: queries are raw DB access only - no (de)serialization, transformation, or business logic. `parts` goes in and comes out as a JSON string; the boundary that owns the type (Feature 2) serializes.
- Filter/order in SQL, never in JS after fetching.
- kebab-case file names.

**Key decisions already made:**

- Driver: `better-sqlite3` + `drizzle-orm`; DB file `local.db` in repo root, gitignored. Path from `process.env.DB_FILE_NAME ?? 'local.db'` so tests can point at a temp file (read in both `src/db/index.ts` and `drizzle.config.ts`).
- IDs: `crypto.randomUUID()` via Drizzle `$defaultFn` - no nanoid dependency.
- Timestamps: `integer` columns with `{ mode: 'timestamp_ms' }`, `$defaultFn(() => new Date())`.
- `PRAGMA foreign_keys = ON` must be set on the better-sqlite3 connection or cascade delete silently does nothing.
- Singleton via `globalThis` caching so Next.js dev hot reload doesn't leak connections.
- Message ordering: `ORDER BY created_at ASC, rowid ASC` - user + assistant messages from one turn can share a millisecond; rowid breaks the tie by insertion order.
- Committed migrations in `drizzle/` (from `db:generate`); tests apply schema with `migrate()` from `drizzle-orm/better-sqlite3/migrator`. Dev workflow may use `db:push` directly.
- This feature touches no Next.js or AI SDK APIs, so the AGENTS.md "read installed docs first" rule has nothing to bite on here - but do verify drizzle APIs against the installed version, not memory.

## Constraints

**Must:**

- Schema exactly per PRD: `threads` (id text PK, title, createdAt, updatedAt), `messages` (id text PK, threadId FK -> threads with `onDelete: 'cascade'`, role `text({ enum: ['user', 'assistant'] })`, parts text, model nullable text, inputTokens/outputTokens nullable integers, createdAt).
- Query functions exactly: `listThreads` (newest first), `getThread`, `createThread`, `renameThread` (also bumps `updatedAt`), `deleteThread` (single delete on threads; cascade handles messages), `getMessagesByThread` (ordered), `insertMessages` (accepts an array - Feature 2 persists user + assistant together).
- Tests assert behavior (what comes back), not SQL strings.

**Must not:**

- No dependencies beyond: `drizzle-orm`, `better-sqlite3` (deps); `drizzle-kit`, `@types/better-sqlite3`, `vitest` (dev deps).
- No Zod, server actions, or `src/types/` here - validation belongs to the boundaries built in Features 2/3.
- No `updatedAt` bump on message insert (PRD open question, deferred to Feature 3).
- Don't touch existing app files (`src/app/*`, `src/components/*`).

**Out of scope:**

- Chat route, UI, server actions, seed data, thread-activity sorting.

## Tasks

### T1: Schema, client, and drizzle-kit wiring

**Do:** Install `drizzle-orm` + `better-sqlite3` (deps) and `drizzle-kit` + `@types/better-sqlite3` (dev). Write `src/db/schema.ts` (both tables per Constraints), `src/db/index.ts` (better-sqlite3 client with `foreign_keys` pragma, drizzle instance with `{ schema }`, globalThis singleton, `DB_FILE_NAME` env fallback), `drizzle.config.ts`. Add `db:push` and `db:generate` scripts. Run `db:generate` and commit the `drizzle/` migrations folder. Gitignore `local.db*`.

**Files:** `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `drizzle/`, `package.json`, `.gitignore`

**Verify:** Delete any `local.db`, run `npm run db:push` - schema created without prompts; `npx tsc --noEmit` and `npm run lint` pass.

### T2: Query layer

**Do:** `src/db/queries/threads.ts` with `listThreads`, `getThread`, `createThread`, `renameThread`, `deleteThread`; `src/db/queries/messages.ts` with `getMessagesByThread`, `insertMessages`. Raw drizzle queries against the singleton, `.returning()` where the caller needs the row, ordering per Key decisions. Insert types via `$inferInsert`.

**Files:** `src/db/queries/threads.ts`, `src/db/queries/messages.ts`

**Verify:** `npx tsc --noEmit` and `npm run lint` pass (behavioral verification lands in T3).

### T3: Vitest + query tests

**Do:** Install `vitest` (dev). Add `vitest.config.ts` with the `@` alias and a setup file that points `DB_FILE_NAME` at a unique temp file (use the OS temp dir), applies `migrate()` from the committed `drizzle/` folder, and removes the file after. Note: set the env var before any test module imports `src/db` (singleton reads it at import time). Add `"test": "vitest run"` script. Tests: create thread -> appears in `listThreads` / `getThread`; `listThreads` orders newest first; `renameThread` updates title + `updatedAt`; insert user + assistant messages -> `getMessagesByThread` returns them in insertion order with parts string, model, and token columns intact (nulls on the user row); `deleteThread` removes the thread and cascades its messages; `getThread` on a missing id returns undefined.

**Files:** `vitest.config.ts`, `src/db/queries/threads.test.ts`, `src/db/queries/messages.test.ts`, test setup file, `package.json`

**Verify:** `npm test` passes.

## Done

- [ ] From a clean checkout (no `local.db`): `npm install && npm run db:push` creates the schema.
- [ ] `npm test` passes - round-trip, ordering, cascade delete all covered.
- [ ] `npm run lint` and `npx tsc --noEmit` pass.
- [ ] `rg -l "better-sqlite3|drizzle" src/ | grep -v '^src/db/'` returns nothing - no DB access outside `src/db/`.
- [ ] `git status` shows no `local.db*` untracked (gitignore works).
