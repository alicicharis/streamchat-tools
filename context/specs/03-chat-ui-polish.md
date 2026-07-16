# Chat UI Polish

## Why

User-requested UI improvements to the Feature 2 chat page (see `context/specs/02-streaming-chat-core.md`, implemented on `feature/streaming-chat-core`).

## What

1. **Empty state**: when a chat has no messages, the chat input is vertically centered on the screen with a heading above it, e.g. "What's on your mind?".
2. **Model picker placement**: the model selector sits immediately to the left of the send button (inside the input row), not elsewhere on the page.
3. **Active state**: once the thread has at least one message, the input (with the picker) is pinned to the bottom of the viewport with a slight margin from the bottom edge. Messages scroll in the area above; the input is always in view regardless of scroll position or streaming.
4. **Dark mode by default**: the app renders in dark mode out of the box.

## Context

- Components to touch: `src/components/chat/chat.tsx`, `chat-input.tsx`, `model-picker.tsx`, `message-list.tsx`; root layout / `globals.css` for dark mode.
- ShadCN v4 on Base UI, Tailwind v4. Check how dark mode is wired in `src/app/globals.css` (theme tokens / `.dark` selector) and apply the idiomatic default (e.g. `dark` class on `<html>` in `src/app/layout.tsx`) - no hardcoded hex, no inline styles (CLAUDE.md).
- The transition from empty-state (centered) to active-state (bottom-pinned) happens on the same mounted `Chat` component when the first message is sent - it must not remount or interrupt the stream.
- Layout via flexbox/grid within the page; the messages area owns the scrolling (auto-scroll during streaming must keep working). Prefer a normal flex column layout where the input is a non-scrolling footer over `position: fixed` if it is cleaner, as long as the visible result matches: input always visible at the bottom with a small margin.

## Constraints

**Must not:** change the API route, schemas, queries, persistence, or any non-UI behavior; add dependencies; add features beyond the four items.

## Tasks

### T1: Chat UI polish

**Do:** Implement all four items above.

**Files:** `src/components/chat/chat.tsx`, `src/components/chat/chat-input.tsx`, `src/components/chat/model-picker.tsx`, `src/components/chat/message-list.tsx`, `src/app/layout.tsx`, `src/app/globals.css` (subset as needed)

**Verify:** `npx tsc --noEmit`, `npm run lint`, `npm test` pass. Visual verification is manual (user).

## Done

- [ ] Empty chat: centered input + "What's on your mind?" heading; picker left of send button.
- [ ] After first send: input pinned at bottom with margin, messages scrollable above, input never leaves view.
- [ ] App is dark by default.
- [ ] tsc / lint / tests pass.
