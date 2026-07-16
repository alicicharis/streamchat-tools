# Token/Cost Counter

## Why

**PRD feature:** Feature 5: Token/cost counter - see `context/prd.md`

Token usage is already persisted per assistant message (Feature 2) but invisible to the user. This feature surfaces per-message tokens + cost and a running thread total, attributed to the model that produced each message.

## What

- `src/lib/pricing.ts`: hardcoded pricing table + pure `computeCost`, unit-tested.
- Every assistant message with usage shows a subtle footer: `123 in / 456 out tokens · $0.0042`.
- Thread header shows the cumulative cost, derived by summing the per-message data already loaded/streamed (no separate counter state).
- Works live (cost appears when the stream finishes, no refresh) and on reload (identical numbers from the DB).
- Messages missing usage render no counter and contribute nothing to the total.

Done when: a Haiku message visibly costs less than an Opus one in the same thread, the thread total equals the sum of message costs across a mid-thread model switch, and both survive reload.

## Context

**Relevant files:**

- `src/lib/models.ts` - `MODEL_IDS` / `ModelId`; pricing table must be keyed by `ModelId`.
- `src/app/api/chat/route.ts` - streaming route. Already captures `usage` in `streamText`'s `onEnd` and persists `inputTokens`/`outputTokens`/`model` on the assistant row. Uses `toUIMessageStream(...)` which accepts a `messageMetadata` option (called on start and finish stream parts) - this is how usage reaches the client live.
- `src/lib/chat-messages.ts` - sole DB-row -> `UIMessage[]` mapper; must attach the same metadata on reload so history renders identically.
- `src/components/chat/chat.tsx` - client component with `useChat`; owns the `messages` array, so it is where the thread total is computed and where the header renders.
- `src/components/chat/message.tsx` - per-message renderer; gets the usage footer for assistant messages.
- `src/components/chat/message-list.tsx` - passes messages through; prop types may need the metadata-typed message.
- `src/db/schema.ts` - `messages.model`, `messages.inputTokens`, `messages.outputTokens` (all nullable) already exist. No schema change.

**Verified AI SDK v7 facts (from `node_modules/ai/dist/index.d.ts`):**

- `UIMessage<METADATA>` carries typed `metadata`; `toUIMessageStream` accepts `messageMetadata?: (options: { part: TextStreamPart<ToolSet> }) => METADATA | undefined`, called on `start` and `finish` parts.
- The `finish` `TextStreamPart` has `totalUsage: LanguageModelUsage` (total across all tool steps).
- `LanguageModelUsage.inputTokens` / `.outputTokens` are `number | undefined` - guard against undefined.

**Patterns to follow:**

- Vitest colocated tests, behavior-focused (see `src/lib/expression-parser.test.ts`).
- Theme tokens only, no hardcoded hex/inline styles; subtle text uses `text-muted-foreground` (see `src/components/chat/tool-card.tsx`).
- Types in `src/types/[feature].ts` per CLAUDE.md.

**Key decisions already made:**

- Pricing per MTok: Opus 4.8 $5 in / $25 out; Sonnet 5 $3 / $15; Haiku 4.5 $1 / $5. Input + output only - no cache tiers.
- Per-message metadata is the single source of truth; the thread total is a pure sum over loaded/streamed messages, never separate state.
- Message metadata shape: `{ model: ModelId; inputTokens: number; outputTokens: number }` - set only when all three are known (finish part with defined tokens; DB row with non-null model + tokens). Otherwise `metadata` stays unset and no counter renders (never a fake $0).
- Cost display: `formatCost` in `pricing.ts` - 4 fraction digits below $1 (`$0.0042`), 2 at or above $1. Total sums raw `computeCost` values, formatting applied once at render.
- Thread header: the chat pane currently has no header. Add a slim right-aligned header bar inside `chat.tsx` (visible only when a total > 0 exists) rendering `ThreadCost`. Keep it minimal - no thread title work.

## Constraints

**Must:**

- Keep `computeCost` and `formatCost` pure and dependency-free; pricing table lives only in `src/lib/pricing.ts`.
- Attach metadata in exactly two places: the route's `messageMetadata` callback (live) and `toUIMessages` (reload) - both producing the identical shape.
- Type the metadata once (`src/types/chat.ts`, e.g. `ChatUIMessage = UIMessage<ChatMessageMetadata>`) and thread it through `useChat`, `toUIMessages`, and message components. No `any`.

**Must not:**

- No new dependencies.
- No schema/migration changes - the columns exist.
- No cache-token pricing, no global cross-thread totals, no changes to tool cards or persistence logic beyond the `messageMetadata` option.

**Out of scope:**

- Cost for in-flight streaming (usage only exists at stream end).
- Backfilling usage for legacy/aborted rows - they simply show no counter.

## Tasks

### T1: Pricing module

**Do:** Create `src/lib/pricing.ts`: `PRICING: Record<ModelId, { inputPerMTok: number; outputPerMTok: number }>` with the three models; `computeCost(model: ModelId, inputTokens: number, outputTokens: number): number` (dollars); `formatCost(cost: number): string` per the display rule. Unit tests: each model's rates, zero tokens, and formatting boundaries (sub-cent never `$0.00`, `$1`+ uses 2 digits).

**Files:** `src/lib/pricing.ts`, `src/lib/pricing.test.ts`

**Verify:** `npx vitest run src/lib/pricing.test.ts`

### T2: Usage metadata plumbing (live + reload)

**Do:** Add `src/types/chat.ts` with `ChatMessageMetadata` and `ChatUIMessage`. In `src/app/api/chat/route.ts`, pass `messageMetadata` to `toUIMessageStream`: on `part.type === 'finish'` with both `part.totalUsage.inputTokens` and `.outputTokens` defined, return `{ model, inputTokens, outputTokens }`; otherwise return `undefined`. In `src/lib/chat-messages.ts`, set `metadata` on rows where `model`, `inputTokens`, and `outputTokens` are all non-null, and type the return as `ChatUIMessage[]`. Update `useChat<ChatUIMessage>` and message-prop types as needed to compile.

**Files:** `src/types/chat.ts`, `src/app/api/chat/route.ts`, `src/lib/chat-messages.ts`, `src/components/chat/chat.tsx`, `src/components/chat/message-list.tsx`

**Verify:** `npx tsc --noEmit && npm run lint`. Manual: send a message, inspect the finished assistant message in React devtools - `metadata` holds model + token counts; reload, same metadata present.

### T3: Message footer and thread total UI

**Do:** `src/components/chat/message-usage.tsx`: given `ChatMessageMetadata`, render a muted footer line `{in} in / {out} out tokens · {formatCost(computeCost(...))}`; render it from `message.tsx` under assistant messages that have metadata. `src/components/chat/thread-cost.tsx`: given messages, sum `computeCost` over those with metadata and render the formatted total (nothing when no message has metadata). In `chat.tsx`, render the header bar with `ThreadCost` above the message list.

**Files:** `src/components/chat/message-usage.tsx`, `src/components/chat/thread-cost.tsx`, `src/components/chat/message.tsx`, `src/components/chat/chat.tsx`

**Verify:** `npx tsc --noEmit && npm run lint`. Manual: footer appears the moment the stream finishes; header total equals the sum of visible footers; user messages and metadata-less assistant messages show no footer.

## Done

- [ ] `npx vitest run` and `npm run lint` pass
- [ ] Manual: send one message on Opus and one on Haiku in the same thread - each footer uses its own model's pricing, Haiku visibly cheaper, header total = sum of both
- [ ] Manual: reload the thread - footers and total unchanged
- [ ] Manual: a thread with tool calls shows usage covering the whole multi-step turn (totalUsage), and the counter appears without refresh
- [ ] No regressions: tool cards, streaming, retry, and thread management still work
