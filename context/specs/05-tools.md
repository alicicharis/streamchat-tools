# Tools

## Why

**PRD feature:** Feature 4: Tools - see `context/prd.md`

The model currently answers everything from memory. This feature grounds weather, math, and currency answers in real data via three server-side tools, and makes tool activity visible as inline cards that persist with the thread.

## What

- `evaluate(expr)` arithmetic parser in `src/lib/expression-parser.ts` (pure, no deps, no `eval`).
- Three AI SDK tools: weather (Open-Meteo), currency (Frankfurter.dev), calculator (wraps the parser).
- Chat route registers the tools on `streamText` with a 5-step cap.
- `ToolCard` renders tool parts: running -> summary -> expandable raw JSON, plus error state. Reloaded threads render identical cards from persisted parts.
- Tool failures reach the model as error results; the turn completes conversationally.

## Context

**Relevant files:**

- `src/app/api/chat/route.ts` - route to update: add `tools` + `stopWhen` to `streamText`; pass `tools` to `convertToModelMessages` too (required so persisted tool parts from prior turns convert correctly).
- `src/components/chat/message.tsx` - currently concatenates text parts and returns `null` when there is no text; must be restructured to render parts in order (text + tool parts interleaved), so a tool-only assistant message still renders.
- `src/lib/chat-messages.ts` - parses persisted parts JSON to `UIMessage[]`; tool parts round-trip through it with no changes.
- `src/components/chat/chat.tsx`, `message-list.tsx` - no changes expected; `DefaultChatTransport`/`useChat` stream tool parts automatically.
- `src/lib/schemas/chat.test.ts`, `src/db/queries/*.test.ts` - existing vitest patterns to imitate.

**Verified against installed packages (ai@7.0.29) - do not trust memory, re-check types in `node_modules/ai/dist/index.d.ts` while implementing:**

- `tool()` is exported from `ai` (re-export of `@ai-sdk/provider-utils`). Shape: `tool({ description, inputSchema, execute })`. `inputSchema` (not `parameters`) takes a Zod schema.
- The step-cap helper in this version is `isStepCount(n)` (NOT `stepCountIs`), used as `stopWhen: isStepCount(5)`. The default is `isStepCount(1)`, so without `stopWhen` no multi-step tool loop happens at all.
- Errors thrown inside a tool's `execute` are caught by the SDK, become `tool-error` content, are sent back to the model as error text, and the loop continues (verified in `dist/index.js`). So tools should throw descriptive `Error`s on failure - no manual error-result wrapping.
- Tool UI parts have `type: 'tool-<name>'` and a `state` union: `input-streaming` | `input-available` | `output-available` (with `output`) | `output-error` (with `errorText`). (Ignore the approval states - not used here.)
- `convertToModelMessages(messages, { tools })` accepts the tool set as an option.
- For typed UI parts, check for an `InferUITools`-style helper in the installed types; if awkward, narrow manually on the three known `tool-*` literals.

**Patterns to follow:**

- Tests colocated next to source (`foo.ts` + `foo.test.ts`), run with `npm run test` (vitest).
- Theme tokens only, no hardcoded hex/inline styles; icons from `@phosphor-icons/react` (see `src/components/threads/thread-item.tsx`).
- Never `any`; infer tool input types from the Zod schemas.

**Key decisions already made:**

- Tool names: `weather`, `calculator`, `currency`. Tool input Zod schemas live inline in each tool file (they are tool definitions, not server-action request schemas), every field bounded.
- External fetches use `AbortSignal.timeout(5000)`; non-OK responses and empty geocoding results throw descriptive `Error`s (message is what the model sees).
- Weather: Open-Meteo geocoding API (`geocoding-api.open-meteo.com/v1/search?name=...&count=1`) then forecast API with `current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`. Include a small WMO weather-code -> description map so output has a human condition string. Output: `{ location, country, temperatureC, condition, windSpeedKmh, humidityPercent }`.
- Currency: Frankfurter (`api.frankfurter.dev/v1/latest?amount=...&from=...&to=...`). Input: `amount` positive finite number, `from`/`to` 3-letter ISO codes (uppercase before calling). Output: `{ amount, from, to, converted, rateDate }`.
- Calculator parser: recursive descent over `+ - * / ^`, parentheses, unary minus, decimal numbers, whitespace ignored. `^` right-associative and binds tighter than `* /`; unary minus binds looser than `^` (`-2^2 === -4`). Throws on: empty/blank input, unknown characters, unbalanced parens, trailing garbage, division by zero. Never uses `eval`/`Function`.
- Card summaries are derived in `tool-card.tsx` per tool (e.g. "18°C, partly cloudy in Berlin, DE", "2+2 = 4", "100 EUR = 108.55 USD"). Raw JSON expand/collapse is local `useState` - no new dependency needed.

## Constraints

**Must:**

- Verify every AI SDK API against `node_modules/ai/dist/index.d.ts` before use; Next.js questions against `node_modules/next/dist/docs/`.
- Keep the route the only place tools are registered; tools execute server-side only.
- Keep persistence unchanged: tool parts ride inside the existing `parts` JSON (`responseMessage.parts` already contains them).

**Must not:**

- No new dependencies (no math libs, no collapsible lib).
- No API keys or env vars for the tool APIs (both are keyless).
- Don't refactor the transport, persistence flow, or unrelated components.

**Out of scope:**

- Client-side tools, tool approval flows, retries/caching of tool fetches.
- Token/cost display (Feature 5).

## Tasks

### T1: Arithmetic expression parser

**Do:** Implement `evaluate(expr: string): number` in `src/lib/expression-parser.ts` per the decisions above (tokenizer + recursive descent, throws `Error` with a human-readable message on invalid input). Thorough unit tests: precedence (`2+3*4`, `2*3^2`), right-assoc `^` (`2^3^2 === 512`), unary minus (`-2^2 === -4`, `--3`, `-(2+3)`), parens/nesting, decimals, whitespace, division by zero, empty input, unbalanced parens, trailing garbage, unknown characters.

**Files:** `src/lib/expression-parser.ts`, `src/lib/expression-parser.test.ts`

**Verify:** `npm run test` and `npm run lint`

### T2: The three tools

**Do:** Create `src/lib/tools/weather.ts`, `src/lib/tools/currency.ts`, `src/lib/tools/calculator.ts`, each exporting a `tool({ description, inputSchema, execute })` per the decisions above (bounded Zod inputs; fetch timeouts; throw on failure; calculator wraps `evaluate` so parser errors propagate as tool errors). Add `src/lib/tools/index.ts` exporting the combined tool set object `{ weather, calculator, currency }` (single source for route and UI part typing). Unit-test each tool's `execute` with a stubbed `fetch` (`vi.stubGlobal`): happy path returns the expected output shape; API error / empty geocoding result / unknown currency rejects with a descriptive `Error`. Calculator: valid expression and invalid expression.

**Files:** `src/lib/tools/{weather,currency,calculator,index}.ts`, `src/lib/tools/{weather,currency,calculator}.test.ts`

**Verify:** `npm run test` and `npm run lint`

### T3: Route handler registration + step cap

**Do:** In `src/app/api/chat/route.ts`: import the tool set, pass `tools` to `streamText` and add `stopWhen: isStepCount(5)`; also pass `{ tools }` to `convertToModelMessages`. Confirm from installed types that nothing else is needed for tool parts to appear in `responseMessage.parts` (persistence is untouched).

**Files:** `src/app/api/chat/route.ts`

**Verify:** `npm run lint`; manual: ask "what is 2+2 times 17?", confirm the assistant answers 70 via the calculator and that the assistant DB row's parts JSON contains a `tool-calculator` part with input and output.

### T4: Tool cards in the message UI

**Do:** Create `src/components/chat/tool-card.tsx` (client component): given a tool UI part, render by `state` - `input-streaming`/`input-available`: tool name + spinner (`CircleNotch` with `animate-spin`); `output-available`: compact per-tool summary with a toggle that expands raw input/output JSON (`<pre>` blocks, `useState`); `output-error`: destructive-toned card showing the tool name + `errorText`. Restructure `src/components/chat/message.tsx` to map over `message.parts` in order, rendering text parts as today (Streamdown for assistant) and `tool-*` parts as `ToolCard`; drop the "no text -> null" early return for assistant messages.

**Files:** `src/components/chat/tool-card.tsx`, `src/components/chat/message.tsx`

**Verify:** `npm run lint`; manual: weather prompt shows running -> summary -> expandable JSON; reload renders the identical card.

## Done

- [ ] `npm run test` and `npm run lint` pass.
- [ ] Manual: "What's the weather in Berlin?", "What is 12.5% of 348?", "Convert 100 EUR to USD" each trigger the right tool; card streams running -> result.
- [ ] Manual: "Weather in Berlin and Tokyo" produces multiple tool cards in one turn; the turn completes within 5 steps.
- [ ] Manual: "Weather in Xyzzyville" and "calculate 1/0" show error cards and a conversational explanation - no broken stream, no unhandled error toast.
- [ ] Manual: reload each of the above threads; cards, expansion, and error states render identically from the DB.
- [ ] No regressions: plain text-only chat, model switching, thread rename/delete still work.
