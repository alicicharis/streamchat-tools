# Streaming Chat Core

## Open questions

- **AI SDK v7 exact API shapes could not be verified while writing this spec** - `ai`, `@ai-sdk/react`, and `@ai-sdk/anthropic` are not yet installed (T1 installs them). The spec names capabilities (custom transport that sends only the new message, `onFinish` persistence, usage token fields, `useChat` status/error/regenerate); the implementer MUST resolve the real names/signatures from the installed package docs and `.d.ts` types before writing T2/T3 code. Do not write SDK code from memory.
- **Markdown renderer: decided `streamdown`** (Vercel's streaming-aware markdown renderer, what the AI SDK docs recommend for streamed assistant text - it handles incomplete markdown blocks mid-stream, which `react-markdown` does not). Confirm against the installed AI SDK v7 docs in T1; if they explicitly recommend otherwise for v7, switch and note it here.
- `node_modules/next/dist/docs/` currently contains only `index.md`. Still check it after install (AGENTS.md rule); key known Next 16 breaking change to respect regardless: dynamic route `params` is a `Promise` and must be awaited.

## Why

**PRD feature:** Feature 2: Streaming chat core - see `context/prd.md` (depends on Feature 1, done).

The vertical slice everything else hangs off: pick a model, send a message, watch Claude stream the reply, reload and get the same conversation back from SQLite. Features 3-5 (sidebar, tools, cost counter) all extend this page and route.

## What

- `POST /api/chat` route handler: Zod-validates `{ threadId, message, model }`, loads prior history from SQLite (server-authoritative), streams a UI message response via `streamText` + Anthropic, persists user + assistant messages in `onFinish`.
- Chat UI: `useChat` client with custom transport (sends only new message + threadId + model), streaming message list with markdown + auto-scroll, model picker, input disabled while streaming, error toast + retry.
- New-chat flow: first send from `/` creates a titled thread (first message truncated to ~60 chars) and lands on `/chat/[threadId]` without killing the stream.
- Unit tests for the title-truncation helper and the chat request schema.

Done when: send -> stream -> reload renders identically; exactly two DB rows per turn; assistant rows carry parts JSON, model ID, and input/output tokens; `npm test` / `npm run lint` / `npx tsc --noEmit` pass.

## Context

**Relevant files:**

- `context/prd.md` - Feature 2 section is the source of truth for modules and acceptance criteria.
- `src/db/schema.ts` - existing tables. `messages.parts` is a JSON string; `model`, `inputTokens`, `outputTokens` nullable (set on assistant rows only).
- `src/db/queries/threads.ts` - `createThread({ title })`, `getThread(id)` exist; use them. Note the query is already named `createThread` - alias it or name the server action `createThreadAction` to avoid a clash.
- `src/db/queries/messages.ts` - `getMessagesByThread(threadId)` (ordered), `insertMessages(rows[])` (array on purpose - persist user + assistant together).
- `src/app/page.tsx` - scaffold demo page; replaced by the `(chat)` route group in T4.
- `src/app/layout.tsx` - root layout, untouched except adding the toaster mount point if the toast component requires it.

**Patterns to follow:**

- CLAUDE.md conventions everywhere: server components by default, reads via direct query calls in server components, mutations via server actions returning `{ success, data, error }`, Zod-first with every field bounded, kebab-case files, no `any`, ShadCN + theme tokens (no hardcoded hex / inline styles), toasts for client feedback.
- `src/db/queries/*` stay raw - JSON (de)serialization of `parts` happens in the chat feature code that owns the `UIMessage` type, never in queries.
- Test style per `src/db/queries/threads.test.ts`: vitest, behavior not internals.

**Key decisions already made:**

- Stack: `ai@7.x`, `@ai-sdk/react@4.x`, `@ai-sdk/anthropic@4.x`, `zod`, `streamdown`. Auth via `ANTHROPIC_API_KEY` in `.env.local` (scaffold `.gitignore` already covers `.env*`).
- `POST /api/chat` is a route handler by documented exception (server actions cannot stream); it is the ONLY route handler - everything else stays server components + server actions.
- Server-authoritative history: client sends only `{ threadId, message, model }` where `message` is the plain text of the new user message. The route rebuilds history from the DB (stored parts JSON -> `UIMessage[]` -> model messages via the SDK's converter) and constructs the user message server-side. The client never sends prior messages.
- Models defined once in `src/lib/models.ts`: `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5` with display names; export the ID tuple for `z.enum` and a default (`claude-sonnet-5`). Route validation, picker, and later pricing all import from here.
- Persistence happens in the stream-response `onFinish`: insert the user row (parts = `[{ type: 'text', text }]` serialized) and the assistant row (full parts JSON, model ID, input/output tokens from usage) in one `insertMessages` call. Aborted/refreshed streams drop the whole turn (`onFinish` doesn't fire) - accepted for v1. Do NOT bump thread `updatedAt` on message insert (PRD defers that to Feature 3).
- New-chat flow: `/` renders the same chat client with no thread. On first submit, call server action `createThreadAction(text)` (Zod-validated, uses `deriveThreadTitle`, returns `{ success, data: { id }, error }`), then send via `useChat` with the new threadId and rewrite the URL with `window.history.replaceState(null, '', `/chat/${id}`)` - a router navigation would remount and kill the stream. A later full reload hits the server component route.
- Title helper `deriveThreadTitle(text)` in `src/lib/thread-title.ts`: collapse whitespace, trim, truncate to 60 chars (append a single ellipsis char when truncated). Pure, unit-tested.
- Chat request schema (`src/lib/schemas/chat.ts`): `threadId` UUID (bounded), `message` trimmed `.min(1).max(8000)`, `model` enum from `src/lib/models.ts` (unknown models rejected at the boundary). Create-thread input schema lives in `src/lib/schemas/threads.ts` (Feature 3 extends that file).
- Shared row->`UIMessage` mapper in `src/lib/chat-messages.ts`, used by both the route (history) and the thread page (initial messages) - the single place `parts` JSON is parsed.
- Errors: route returns 400 on validation failure, 404 on unknown thread; `useChat` error state surfaces as a toast plus an inline retry affordance (the SDK's retry/regenerate mechanism - verify name in docs). Never a silent hang. Route must not log request bodies.
- ShadCN components via the CLI (v4 on Base UI - component APIs differ from Radix examples; read what the CLI generates): select for the picker, sonner/toast for feedback.

## Constraints

**Must:**

- Read installed docs before SDK/framework code: `node_modules/ai` + `node_modules/@ai-sdk/*` docs and types, `node_modules/next/dist/docs/`, `streamdown` README.
- Verify from installed types, not memory: custom transport shape, `toUIMessageStreamResponse`-equivalent + its `onFinish` payload (where the assistant `UIMessage` and usage token counts live), UIMessage->model-message converter, `useChat` API (status, error, retry, sending extra body fields).
- File layout exactly per PRD: `src/app/api/chat/route.ts`, `src/app/(chat)/page.tsx`, `src/app/(chat)/chat/[threadId]/page.tsx`, `src/components/chat/{chat,message-list,message,model-picker,chat-input}.tsx`, `src/lib/models.ts`, `src/lib/schemas/chat.ts`.
- All DB access through `src/db/queries/*`; pages are server components calling queries directly; `'use client'` only where interactivity requires it.
- Unknown `threadId` on `/chat/[threadId]` -> `notFound()`. `params` awaited (Next 16 Promise params).
- Assistant text rendered as markdown (streamdown); user text plain.

**Must not:**

- No dependencies beyond: `ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`, `zod`, `streamdown` (+ ShadCN-generated component code).
- No tools, no sidebar, no cost display, no rename/delete, no resumable streams, no LLM-generated titles (Features 3-5 / out of scope).
- No changes to `src/db/` (schema and queries already cover this feature).
- No data fetching in server actions; no second route handler.

**Out of scope:**

- Tool cards, thread sidebar/layout, token/cost UI, message editing/regeneration-as-a-feature, attachments.

## Tasks

### T1: Dependencies, models, schemas, title helper + unit tests

**Do:** Install `ai@7`, `@ai-sdk/react@4`, `@ai-sdk/anthropic@4`, `zod`, `streamdown`. Read the installed AI SDK docs/types now and confirm the transport/persistence/usage API shapes and the markdown recommendation (update Open questions if reality differs from this spec). Add `ANTHROPIC_API_KEY` to `.env.local`. Write `src/lib/models.ts` (IDs + display names + default + tuple for `z.enum`), `src/lib/thread-title.ts` (`deriveThreadTitle`), `src/lib/schemas/chat.ts` (chat request schema per Key decisions), `src/lib/schemas/threads.ts` (create-thread input: message text, trimmed, bounded). Vitest tests: title helper (short passthrough, whitespace collapse, exactly-60, >60 truncates with ellipsis) and chat schema (valid body; unknown model rejected; oversized/empty message rejected; missing/malformed threadId rejected).

**Files:** `package.json`, `.env.local`, `src/lib/models.ts`, `src/lib/thread-title.ts`, `src/lib/thread-title.test.ts`, `src/lib/schemas/chat.ts`, `src/lib/schemas/chat.test.ts`, `src/lib/schemas/threads.ts`

**Verify:** `npm test`, `npm run lint`, `npx tsc --noEmit` pass.

### T2: Chat API route

**Do:** `src/lib/chat-messages.ts` (DB rows -> `UIMessage[]`, sole `parts` JSON parse point) and `src/app/api/chat/route.ts`: parse body with the chat schema (400 + `{ success: false, error }` on failure), `getThread` (404 if missing), `getMessagesByThread` -> `UIMessage[]` -> append server-built user message -> convert to model messages -> `streamText` with `@ai-sdk/anthropic` and the validated model -> return the UI message stream response. In its `onFinish`, `insertMessages` with both rows: user (`role`, serialized text part, nulls elsewhere) and assistant (serialized response parts, `model`, `inputTokens`, `outputTokens` from usage). Wrap the stream setup so provider/API failures produce a proper error response/stream error part, not a hang.

**Files:** `src/lib/chat-messages.ts`, `src/app/api/chat/route.ts`

**Verify:** `npx tsc --noEmit` + `npm run lint`. Manual: seed a thread via a scratch script (or reuse a test DB), `curl -N POST /api/chat` with a valid body -> stream chunks arrive; then confirm 2 new rows in `local.db` with parts/model/tokens set; invalid model -> 400; unknown threadId -> 404.

### T3: Chat client components

**Do:** Add ShadCN select + toast (sonner) via the CLI (mount toaster in root layout if required). Build `src/components/chat/chat.tsx` (`'use client'`: `useChat` with custom transport sending only `{ threadId, message, model }`, accepts `threadId: string | null` + `initialMessages`, holds model state, invokes `onFirstSend` callback path used in T4), `model-picker.tsx` (select over `src/lib/models.ts`, changeable any time, current value rides on every request), `chat-input.tsx` (textarea + submit, disabled while streaming, Enter submits), `message-list.tsx` (auto-scroll to bottom during streaming), `message.tsx` (renders text parts; assistant via streamdown, user plain; unknown part types ignored for now). Error state: toast on `useChat` error + inline retry affordance.

**Files:** `src/components/chat/chat.tsx`, `src/components/chat/message-list.tsx`, `src/components/chat/message.tsx`, `src/components/chat/model-picker.tsx`, `src/components/chat/chat-input.tsx`, `src/components/ui/*` (CLI-generated), `src/app/layout.tsx` (toaster only)

**Verify:** `npx tsc --noEmit` + `npm run lint` (E2E lands in T4).

### T4: Pages + new-chat flow

**Do:** Create route group: `src/app/(chat)/page.tsx` (server component rendering `Chat` with `threadId={null}`; delete the scaffold `src/app/page.tsx`) and `src/app/(chat)/chat/[threadId]/page.tsx` (await `params`, `getThread` -> `notFound()` if missing, `getMessagesByThread` -> `toUIMessages`, render `Chat`). `src/actions/threads.ts` with `createThreadAction`: Zod-validate the first message, `deriveThreadTitle`, create via query layer, return `{ success, data: { id }, error }`. Wire the first-send path in `chat.tsx`: no threadId -> call action, on success send via `useChat` with the new id and `window.history.replaceState` to `/chat/[id]`; on failure toast the error and keep the input intact.

**Files:** `src/app/(chat)/page.tsx`, `src/app/(chat)/chat/[threadId]/page.tsx`, `src/actions/threads.ts`, `src/components/chat/chat.tsx`, deleted `src/app/page.tsx`

**Verify:** Manual: from `/`, type a message, send -> reply streams, URL becomes `/chat/[id]` without interrupting the stream; DB shows the thread titled with the (truncated) first message.

## Done

- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit` all pass.
- [ ] Manual: send from `/` -> thread created with ~60-char title, URL is `/chat/[id]`, reply streams token-by-token.
- [ ] Manual: send a >60-char first message -> sidebar-ready title is truncated with ellipsis in the DB.
- [ ] Manual: switch model mid-thread -> next assistant DB row carries the new model ID.
- [ ] Manual: reload `/chat/[id]` -> full conversation re-renders from the DB identically; exactly 2 rows per completed turn; assistant rows have parts JSON, model, inputTokens, outputTokens.
- [ ] Manual: bogus `ANTHROPIC_API_KEY` (or network off) -> visible error toast + retry, no silent hang; `/chat/does-not-exist` -> 404 page.
- [ ] `rg -l "better-sqlite3|drizzle" src/ | grep -v '^src/db/'` still returns nothing.
