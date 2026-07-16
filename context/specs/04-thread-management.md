# Thread Management

## Open questions

- The sidebar will not re-sort live when a stream finishes bumping `updatedAt` (the sidebar is a server component; nothing re-fetches RSC at stream end). Decision below is to accept staleness until the next navigation/refresh. If live re-sorting is wanted, that is a follow-up (e.g. `router.refresh()` in `onFinish` on the client), not part of this spec.

## Why

**PRD feature:** Feature 3: Thread management - see `context/prd.md`.

Conversations persist (Features 1-2) but there is no way to see, revisit, rename, or delete them. This adds the sidebar that makes the app multi-thread.

## What

A persistent sidebar alongside the chat pane: lists all threads newest-activity-first, highlights the active one, has a "New chat" button, and a per-thread overflow menu with rename and delete (delete behind a confirmation dialog; deleting the active thread redirects to `/`). Mutations are server actions with Zod validation returning `{ success, data, error }`.

## Context

**Relevant files:**

- `src/db/queries/threads.ts` - `listThreads`, `getThread`, `createThread`, `renameThread`, `deleteThread` already exist. Needs `touchThread` and an ordering change.
- `src/db/queries/threads.test.ts` - existing query test patterns (deterministic timestamps via direct `db.update`).
- `src/actions/threads.ts` - `createThreadAction` exists; defines the `ActionResult<T>` shape and the `createThread as createThreadQuery` import-aliasing pattern (needed again: action names collide with query names).
- `src/lib/schemas/threads.ts` - `createThreadSchema` exists; add rename/delete schemas here.
- `src/lib/schemas/chat.test.ts` - schema test pattern to copy for `threads.test.ts`.
- `src/app/(chat)/page.tsx`, `src/app/(chat)/chat/[threadId]/page.tsx` - existing pages; a new `src/app/(chat)/layout.tsx` will wrap both.
- `src/components/chat/chat.tsx` - client chat component. Root uses `h-dvh`; must become `h-full` once the new layout owns viewport height. Note: new-thread creation uses `window.history.replaceState` (no router navigation), which matters for sidebar freshness (see decisions).
- `src/app/api/chat/route.ts` - persistence happens in `onEnd`; the `updatedAt` bump goes there.
- `src/components/ui/` - only `button`, `select`, `sonner` exist. Dialog, dropdown/menu, and input components must be added via the shadcn CLI.

**Patterns to follow:**

- Actions: Zod `safeParse` first, first issue message as `error`, `{ success, data, error }` - see `createThreadAction`.
- Queries stay raw (no validation/business logic) - see `src/db/queries/threads.ts`.
- Toasts via `sonner` for action feedback - see `chat.tsx`; field-level Zod errors inline under the input in the rename dialog, not in toasts.
- Icons from phosphor (`components.json` iconLibrary).

**Key decisions already made:**

- **`updatedAt` bumps on new messages, and the sidebar sorts by `updatedAt` desc** (resolves the PRD open question, per its lean). Rationale: a sidebar ordered by activity matches every mainstream chat UI and `renameThread` already bumps `updatedAt`. Implementation: `touchThread(id)` query called from the chat route's `onEnd` after `insertMessages`; `listThreads` orders by `updatedAt` desc.
- No live sidebar re-sort at stream end (see Open questions). Ordering is correct on next render.
- Active-thread highlight is client-side via `usePathname()` in `thread-item.tsx` - layouts don't receive route params, so the server-component sidebar can't know the active thread.
- Deleting the active thread: the client dialog compares the deleted id to the current pathname and `router.push('/')` on success. The action itself never calls `redirect()` (it must return `{ success, data, error }`).
- Actions call `revalidatePath` so the sidebar reflects mutations. Also add `revalidatePath` to `createThreadAction`: thread creation happens while the route is `/` (navigation is via `replaceState`), so revalidating from the action is what makes the new thread appear in the sidebar without a full navigation. Verify exact `revalidatePath` semantics/signature against `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` before writing it.
- Rename title schema: `.trim().min(1).max(100)` (creation-derived titles cap at ~60 chars + ellipsis). Thread id: `z.string().uuid()` (ids are `crypto.randomUUID()`).
- shadcn is **v4 on Base UI, not Radix** - component APIs differ from common examples. After `shadcn add`, read the generated files in `src/components/ui/` and build against what they actually export. Style is `base-luma`; pick the appropriate registry items for a modal dialog (confirmation + form) and a per-item overflow menu (whatever the Base UI registry names them - e.g. `dialog`/`alert-dialog`, `dropdown-menu`/`menu`), plus `input`.
- Next.js 16: consult `node_modules/next/dist/docs/` for anything framework-specific (nested layouts, `revalidatePath`, `usePathname`, `useRouter`) - do not write from memory.

## Constraints

**Must:**

- Reads via server components calling `src/db/queries/threads.ts` directly; server actions for mutations only - no data fetching in actions.
- Every schema field bounded (`.min`/`.max`); validate before touching the DB.
- Theme tokens only - no hardcoded hex, no inline styles.
- Delete requires explicit confirmation (destructive action).

**Must not:**

- Add non-shadcn dependencies.
- Change the chat streaming logic, message persistence shape, or schemas outside `threads.ts`.
- Refactor existing components beyond the minimal `h-dvh` -> `h-full` layout handoff in `chat.tsx`.

**Out of scope:**

- LLM-generated titles, search, thread pinning/archiving, bulk delete, live sidebar re-sort at stream end, mobile drawer behavior (a fixed-width sidebar is fine for this local app).

## Tasks

### T1: Activity ordering (`updatedAt` bump + sort)

**Do:** Add `touchThread(id)` to `src/db/queries/threads.ts` (set `updatedAt: new Date()`, no return needed). Change `listThreads` to order by `updatedAt` desc. Call `touchThread(threadId)` in `src/app/api/chat/route.ts` `onEnd` after `insertMessages`. Update/extend `threads.test.ts`: `touchThread` bumps `updatedAt`; `listThreads` orders by `updatedAt` (adjust the existing ordering test, which manipulates `createdAt`).

**Files:** `src/db/queries/threads.ts`, `src/db/queries/threads.test.ts`, `src/app/api/chat/route.ts`

**Verify:** `npm test` passes; `npx tsc --noEmit`.

### T2: Schemas + server actions

**Do:** In `src/lib/schemas/threads.ts` add `renameThreadSchema` (`id` uuid, `title` `.trim().min(1).max(100)`) and `deleteThreadSchema` (`id` uuid). In `src/actions/threads.ts` add `renameThreadAction(id, title)` and `deleteThreadAction(id)`: safeParse -> query (alias imports to avoid name collisions) -> `revalidatePath` -> `ActionResult`. Rename returns the updated thread (`{ id, title }`); rename/delete of a nonexistent id returns `success: false` with a "Thread not found" error (rename can detect via the query's `undefined` return; delete needs a `getThread` check first or a returning delete - keep the check in the action, not the query). Add `revalidatePath` to `createThreadAction`. Add `src/lib/schemas/threads.test.ts` covering valid input, empty/whitespace title, over-max title, and non-uuid id.

**Files:** `src/lib/schemas/threads.ts`, `src/lib/schemas/threads.test.ts`, `src/actions/threads.ts`

**Verify:** `npm test` passes; `npx tsc --noEmit`.

### T3: Sidebar UI + layout

**Do:**

1. Add needed shadcn components (dialog/confirmation dialog, menu, input) via the shadcn CLI; read the generated Base UI APIs before use.
2. `src/components/threads/thread-sidebar.tsx` - server component: `listThreads()`, "New chat" button (link to `/`), scrollable thread list, empty state when no threads.
3. `src/components/threads/thread-item.tsx` - client component: `<Link href={/chat/{id}}>` with truncated title, active highlight via `usePathname()`, overflow menu (Rename, Delete - Delete styled destructive).
4. `src/components/threads/rename-dialog.tsx` - input prefilled with current title; on submit call `renameThreadAction`; Zod/validation errors inline under the input; success closes dialog + toast.
5. `src/components/threads/delete-dialog.tsx` - confirmation dialog naming the thread; on confirm call `deleteThreadAction`; on success toast, and if the deleted id matches the current path, `router.push('/')`.
6. `src/app/(chat)/layout.tsx` - server component: `flex h-dvh` row of `<ThreadSidebar />` (fixed width, bordered) + `<main className="flex-1 min-w-0">{children}</main>`. Change `chat.tsx` root `h-dvh` -> `h-full` so the layout owns viewport height.

**Files:** `src/components/threads/thread-sidebar.tsx`, `thread-item.tsx`, `rename-dialog.tsx`, `delete-dialog.tsx`, `src/app/(chat)/layout.tsx`, `src/components/chat/chat.tsx`, new `src/components/ui/*` from shadcn

**Verify:** `npx tsc --noEmit`, `npm run lint`, `npm test`. Manual: create several threads; sidebar lists newest-activity first; sending a message in an old thread moves it to the top after a refresh/navigation; active thread highlighted; switching threads loads history; new thread created from `/` appears in the sidebar after first send; rename with empty title shows inline error, valid rename updates the sidebar immediately; delete shows confirmation, removes the thread; deleting the active thread lands on `/`.

## Done

- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit` pass.
- [ ] Manual: full flow from T3's verify list, including both unhappy paths (empty rename title, cancel on delete confirmation).
- [ ] No regressions: streaming chat, empty-state centering, and bottom-pinned input all behave as before inside the new layout.
