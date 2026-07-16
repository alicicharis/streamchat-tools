# Product Requirements Document

## Vision

Streamchat Tools is a local, single-user conversational AI app where the user chats with Claude, watches responses stream in real time, and sees the model invoke external tools (weather lookup, calculator, currency conversion) mid-conversation - with a transparent token/cost counter showing exactly what every message and every conversation costs.

## Problem Statement

- Chat UIs hide what the model is doing: tool calls happen invisibly, and users cannot tell when the model consulted an external source vs. answered from memory.
- LLM usage cost is opaque: users have no per-message or per-conversation view of token consumption, and no way to compare what the same workload costs across model tiers.
- Conversations are ephemeral in most demos: refresh the page and the thread, including tool activity, is gone.

## Solution Overview

A Next.js 16 App Router app with a persistent thread sidebar and a streaming chat pane. The chat is powered by the Vercel AI SDK (v7) with Anthropic as the provider and a per-chat model picker (Opus 4.8 / Sonnet 5 / Haiku 4.5, switchable mid-conversation). The model decides when to call one of three server-side tools backed by real keyless APIs; tool activity renders as inline status cards. Every message - including full tool call parts and per-message token usage + model - is persisted to local SQLite via Drizzle, making the DB the single source of truth for conversation history. A cost counter derives per-message and per-thread cost from the stored usage and a hardcoded pricing table.

## User Stories

1. As a user, I want to type a message and see the response stream token-by-token, so that the app feels responsive and alive.
2. As a user, I want to ask about the weather in a city and have the model fetch real current conditions, so that answers are grounded in live data.
3. As a user, I want to ask math questions and have the model use a calculator tool, so that arithmetic is exact rather than hallucinated.
4. As a user, I want to ask for currency conversions at real exchange rates, so that the numbers are trustworthy.
5. As a user, I want to see an inline card when the model invokes a tool, showing which tool ran and what it returned, so that I understand how the answer was produced.
6. As a user, I want to expand a tool card to see the raw input and output JSON, so that I can inspect exactly what was sent and received.
7. As a user, I want the model to chain multiple tool calls in one turn when needed (e.g. weather in two cities), so that complex questions get complete answers.
8. As a user, I want to pick which Claude model answers (Opus 4.8, Sonnet 5, Haiku 4.5), so that I control the capability/cost tradeoff.
9. As a user, I want to switch models mid-conversation, so that I can compare answers or drop to a cheaper model for simple follow-ups.
10. As a user, I want each assistant message to show the tokens it used and what it cost, so that I can see the price of individual answers.
11. As a user, I want a running cost total for the whole conversation, so that I know what a thread has cost me overall.
12. As a user, I want cost computed with the pricing of the model that actually produced each message, so that mid-thread model switches are attributed correctly.
13. As a user, I want my conversations saved automatically, so that nothing is lost when I close the browser.
14. As a user, I want a sidebar listing my past conversations, so that I can return to any of them.
15. As a user, I want threads titled by my first message, so that I can recognize conversations at a glance.
16. As a user, I want to start a new chat with one click, so that switching topics is frictionless.
17. As a user, I want to rename a thread, so that I can organize my sidebar.
18. As a user, I want to delete a thread with a confirmation prompt, so that cleanup is possible but never accidental.
19. As a user, I want a reloaded thread to render exactly as it streamed - including tool cards and per-message costs - so that history is faithful.
20. As a user, I want a graceful message when a tool or the API fails, so that errors never leave the UI broken or blank.
21. As a user, I want the model to explain when a tool fails (e.g. unknown city) and continue the conversation, so that failures are conversational, not fatal.

## Feature Roadmap

### Feature 1: Data foundation

- **Status**: `done`
- **Priority**: P0
- **Depends on**: none
- **Description**: SQLite database with Drizzle ORM holding threads and messages, plus a raw-query layer. Invisible to the user but everything else stands on it.
- **Modules**:
  - `src/db/schema.ts` - Drizzle table definitions. `threads`: id (text, nanoid/uuid), title, createdAt, updatedAt. `messages`: id, threadId (FK -> threads, cascade delete), role (`user` | `assistant`), parts (text column storing the AI SDK UIMessage parts array as JSON), model (nullable text - set on assistant messages), inputTokens / outputTokens (nullable integers - set on assistant messages), createdAt.
  - `src/db/index.ts` - better-sqlite3 client + drizzle instance (singleton).
  - `src/db/queries/threads.ts` - listThreads, getThread, createThread, renameThread, deleteThread. Raw queries only, no business logic.
  - `src/db/queries/messages.ts` - getMessagesByThread (ordered by createdAt), insertMessage(s).
  - `drizzle.config.ts` + npm scripts for `drizzle-kit push`/`generate`.
- **Implementation decisions**:
  - Driver: `better-sqlite3`; DB file (e.g. `local.db`) gitignored.
  - All DB types inferred via `typeof table.$inferSelect` - never defined manually (per CLAUDE.md).
  - `parts` stored as serialized JSON text; the query layer returns it raw - (de)serialization happens at the boundary that owns the type, not in queries.
  - Cascade delete: removing a thread removes its messages in one statement, filtered in the DB.
- **Testing approach**: Add vitest as the test runner (first feature, so it lands here). Unit-test the query functions against a temp SQLite file: create thread -> insert messages -> read back ordered -> delete cascades. Test behavior (what comes back), not SQL strings.
- **Acceptance criteria**:
  - `drizzle-kit push` creates the schema from a clean checkout.
  - Query functions round-trip threads and messages, ordering and cascade delete verified by tests.
  - No DB access exists outside `src/db/`.

### Feature 2: Streaming chat core

- **Status**: `done`
- **Priority**: P0
- **Depends on**: Feature 1
- **Description**: The vertical slice - a chat page where the user picks a model, sends a message, and watches Claude's reply stream in. Conversations persist and reload faithfully.
- **Modules**:
  - `src/app/api/chat/route.ts` - POST route handler (the one streaming exception to the server-actions rule; `useChat` requires an endpoint and server actions cannot stream). Zod-validates `{ threadId, message, model }`, loads prior messages from SQLite (server-authoritative history), calls `streamText` with the Anthropic provider and the requested model, streams a UI message response, and in `onFinish` persists the new user message and the assistant message with its parts, model, and token usage.
  - `src/app/(chat)/chat/[threadId]/page.tsx` - server component: loads thread + messages via queries, renders the chat client with initial messages.
  - `src/app/(chat)/page.tsx` - new-chat entry: first send creates the thread (title = first user message truncated to ~60 chars) and navigates to `/chat/[threadId]`.
  - `src/components/chat/chat.tsx` - client component wrapping `useChat` with a custom transport that sends only the new message + threadId + model (not the full history).
  - `src/components/chat/message-list.tsx`, `message.tsx` - render text parts (markdown for assistant text), auto-scroll during streaming.
  - `src/components/chat/model-picker.tsx` - select over the three model IDs, changeable at any time; selected model rides along on each request.
  - `src/components/chat/chat-input.tsx` - textarea + submit, disabled while streaming.
  - `src/lib/models.ts` - the single list of supported model IDs + display names (shared by picker, route validation, and later pricing).
  - `src/lib/schemas/chat.ts` - Zod schema for the chat request body, every field bounded.
- **Implementation decisions**:
  - AI SDK v7 and Next.js 16 both post-date training data. Before writing any AI SDK or Next.js code, read the installed docs: `node_modules/next/dist/docs/` and the AI SDK package docs/types for the installed `ai@7.x` / `@ai-sdk/anthropic@4.x` / `@ai-sdk/react@4.x`. Do not write `useChat`/`streamText`/transport code from memory.
  - Server-authoritative history: the DB is the source of truth; the client never sends prior messages. Persisted UIMessage parts are converted to model messages server-side each turn.
  - Model ID allowlist enforced by Zod (reject unknown models at the boundary).
  - Aborted/refreshed streams drop the partial assistant message (`onFinish` only fires on completion) - accepted for v1.
  - API errors surface as a visible error state in the chat (toast + inline retry affordance), never a silent hang.
- **Testing approach**: Unit-test the title-truncation helper and chat request schema (valid/invalid model IDs, oversized input). Streaming behavior is verified manually end-to-end: send message, watch stream, reload page, confirm identical render and that exactly two rows were persisted per turn.
- **Acceptance criteria**:
  - Sending a message streams a reply from the selected model; switching models mid-thread takes effect on the next message.
  - First message from `/` creates a titled thread and lands on its URL.
  - Reloading a thread re-renders the full conversation from the DB.
  - Assistant rows in the DB carry parts JSON, model ID, and input/output token counts.

### Feature 3: Thread management

- **Status**: `done`
- **Priority**: P1
- **Depends on**: Feature 2
- **Description**: Sidebar with all conversations - switch between them, start new ones, rename, and delete (with confirmation).
- **Modules**:
  - `src/components/threads/thread-sidebar.tsx` - server component: lists threads (newest first) via queries, highlights the active thread, "New chat" button linking to `/`.
  - `src/components/threads/thread-item.tsx` - client component: link + overflow menu (rename, delete).
  - `src/components/threads/rename-dialog.tsx`, `delete-dialog.tsx` - shadcn dialogs; delete requires explicit confirmation (destructive action per CLAUDE.md).
  - `src/actions/threads.ts` - server actions `renameThread`, `deleteThread`: Zod-validate, mutate via queries, `revalidatePath`, return `{ success, data, error }`.
  - `src/lib/schemas/threads.ts` - Zod schemas (title bounded with `.min(1).max(...)`).
  - Layout update: `src/app/(chat)/layout.tsx` renders sidebar + chat pane.
- **Implementation decisions**:
  - Reads through server components; mutations through server actions - no data fetching in actions.
  - Deleting the active thread navigates back to `/`.
  - Toasts for action feedback; field-level Zod errors inline in the rename dialog.
- **Testing approach**: Unit-test the thread schemas. Manual verification of the flows: create several threads, switch, rename (inline validation on empty title), delete with confirm, delete active thread redirects.
- **Acceptance criteria**:
  - Sidebar lists all threads and marks the active one; switching loads that thread's history.
  - Rename persists and reflects immediately; delete asks for confirmation, removes thread + messages, and redirects if it was active.
  - All mutations return `{ success, data, error }` and validate input before touching the DB.

### Feature 4: Tools

- **Status**: `done`
- **Priority**: P1
- **Depends on**: Feature 2
- **Description**: The model can look up real weather, evaluate math expressions, and convert currencies mid-conversation. Tool activity is visible as inline status cards that persist with the thread.
- **Modules**:
  - `src/lib/tools/weather.ts` - AI SDK tool: Zod input (location string), geocodes + fetches current conditions from Open-Meteo (keyless).
  - `src/lib/tools/currency.ts` - AI SDK tool: Zod input (amount, from, to as ISO codes), fetches ECB rates from Frankfurter.dev (keyless).
  - `src/lib/tools/calculator.ts` - AI SDK tool wrapping the parser below.
  - `src/lib/expression-parser.ts` - deep module: a pure, dependency-free safe arithmetic expression evaluator (`+ - * / ^`, parentheses, unary minus; no `eval`). Simple interface: `evaluate(expr: string): number` (throws on invalid input). The unit-test workhorse of this feature.
  - `src/components/chat/tool-card.tsx` - renders a tool part across its states: running (name + spinner) -> compact human-readable result summary -> expandable raw input/output JSON. Error state for failed calls.
  - Route handler update: register the three tools on `streamText`, cap the loop with the v7 equivalent of `stopWhen: stepCountIs(5)`.
- **Implementation decisions**:
  - Tools execute server-side inside the chat route; external fetches get short timeouts.
  - Tool failures (API down, unknown city, invalid expression, unknown currency) are returned to the model as error results so it can respond conversationally - never an unhandled stream error.
  - Tool parts persist inside the message parts JSON (already covered by Feature 1's schema), so reloaded threads show the same cards.
  - Multi-step and parallel tool calls allowed within the 5-step cap.
- **Testing approach**: Thorough unit tests for `expression-parser.ts` (precedence, parens, unary minus, division by zero, malformed input). Unit-test each tool's execute with mocked `fetch` (happy path + API error -> error result shape). Manual E2E: prompts that trigger each tool, a multi-tool prompt ("weather in Berlin and Tokyo"), and a failure prompt ("weather in Xyzzyville").
- **Acceptance criteria**:
  - Each tool triggers on natural prompts and its card streams from running to result.
  - Cards expand to raw JSON; reloaded threads render identical cards.
  - A failing tool yields a conversational explanation from the model, and the turn completes normally.
  - No tool loop exceeds the step cap.

### Feature 5: Token/cost counter

- **Status**: `done`
- **Priority**: P1
- **Depends on**: Feature 2 (usage data), benefits from 4
- **Description**: Every assistant message shows its token usage and cost; the thread header shows the cumulative total. Costs are attributed to the model that produced each message.
- **Modules**:
  - `src/lib/pricing.ts` - deep module: hardcoded pricing table (per-MTok input/output for the three models: Opus 4.8 $5/$25, Sonnet 5 $3/$15, Haiku 4.5 $1/$5) + pure `computeCost(model, inputTokens, outputTokens): number`. Single place pricing ever changes.
  - `src/components/chat/message-usage.tsx` - subtle per-message footer: `in/out tokens · $0.0042`.
  - `src/components/chat/thread-cost.tsx` - thread header total, summed from the messages already loaded/streamed (per-message data is the single source; no separate counter state).
  - Streaming path: surface usage on the final streamed message so the counter updates live at stream end, not only after reload.
- **Implementation decisions**:
  - Input + output tokens only; prompt caching is out of scope so no cache pricing tiers.
  - Costs formatted to sensible precision (sub-cent values must not render as $0.00).
  - Messages missing usage (e.g. legacy/aborted rows) render no counter rather than a fake $0.
- **Testing approach**: Unit-test `computeCost` (each model, zero tokens, rounding/formatting boundaries). Manual: verify a Haiku message costs visibly less than an Opus one, thread total equals the sum of message costs after a mid-thread model switch, and totals survive reload.
- **Acceptance criteria**:
  - Each assistant message displays tokens + cost computed with its own model's pricing.
  - Thread total is correct across mid-thread model switches and after reload.
  - Live: cost appears when the stream finishes, without a refresh.

## Architecture Decisions

- **Framework**: Next.js 16.2.10, App Router, React 19. Breaking changes vs. training data - always consult `node_modules/next/dist/docs/` before writing framework code (per AGENTS.md).
- **AI layer**: Vercel AI SDK v7 (`ai@7.x`, `@ai-sdk/react@4.x`) with `@ai-sdk/anthropic@4.x`. Also newer than training data - verify every API (useChat, transports, streamText, tool(), step control, usage fields) against installed package docs/types before use.
- **Models**: `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5`, defined once in `src/lib/models.ts`. Auth via `ANTHROPIC_API_KEY` env var.
- **Data**: SQLite + Drizzle + better-sqlite3. DB is the single source of truth for history (server-authoritative: client sends only the new message). Full UIMessage parts stored as JSON per message; model + token usage stored per assistant message.
- **Server patterns**: server components for reads (direct query calls); server actions for mutations (Zod first, `{ success, data, error }` result); the streaming chat endpoint is a route handler by documented exception. All queries live in `src/db/queries/`, filtering in SQL.
- **UI**: shadcn v4 on Base UI (not Radix - component APIs differ from common examples), Tailwind v4, theme tokens from `globals.css`, no hardcoded hex/inline styles. Toasts for client feedback; destructive actions gated by confirmation dialogs.
- **Auth**: none - single-user local app. CLAUDE.md's auth/ownership rule is explicitly N/A; input validation still applies everywhere.
- **Testing**: vitest for pure modules (expression parser, pricing, schemas, queries); streaming/tool flows verified manually end-to-end.

## Out of Scope

- Authentication, users, or multi-tenancy.
- Provider switching (OpenAI) or provider abstraction.
- Prompt caching and cache-aware pricing.
- LLM-generated thread titles.
- Message editing, regeneration, or branching.
- Resumable streams (partial assistant messages from aborted streams are dropped).
- Global all-time cost across threads (easy later; per-message data already supports it).
- Deployment/hosting concerns - local development only.
- Chat search, export, or attachments.

## Open Questions

- **Markdown renderer** for assistant text: Vercel's `streamdown` (built for AI SDK streaming) vs. `react-markdown`. Decide in Feature 2 after checking what AI SDK v7 docs recommend.
- **Exact AI SDK v7 API shapes** (custom transport for send-only-new-message, step-cap option name, where usage lands in `onFinish` and on streamed messages) - resolve from installed docs at implementation time; the PRD intentionally names capabilities, not signatures.
- Whether thread `updatedAt` should bump on new messages so the sidebar sorts by activity rather than creation (leaning yes; confirm in Feature 3).
