@AGENTS.md

# Streamchat Tools

A conversational AI app where users chat with an LLM that streams responses in real time and can invoke external tools (weather lookup, calculator, currency converter) mid-conversation.

## Drizzle

- Infer DB types from the schema via `typeof table.$inferSelect` - never define them manually

## Next.js

- Server components by default; `'use client'` only for interactivity, hooks, or browser APIs
- Server Actions for form submissions and simple mutations

## UI

- ShadCN components; theme tokens from globals.css - no hardcoded hex, no inline `style` or `<style>` blocks
- Toasts for client-side feedback; field-level Zod errors stay inline under the control, not in toasts
- Destructive actions require a confirmation prompt

## Server Actions

- Validate input with Zod before any logic; schemas in `src/lib/schemas/[feature].ts`; every field bounded with `.max()` (and `.min()` where sensible)
- Enforce auth and ownership before any mutation
- Catch errors and return `{success, data, error}`
- Never log sensitive values (passwords, tokens, full request bodies)

## Database

- All DB access goes through `src/db/queries/[feature].ts` - raw queries only, no transformation or business logic
- Reads: server components call query functions directly. Server Actions are for mutations only, never data fetching
- Filter in the DB, never in JS after fetching

## File Organization

- kebab-case file names, named after the responsibility, not the technology; exported components stay PascalCase
- Components: `src/components/[feature]/`, actions: `src/actions/[feature].ts`, types: `src/types/[feature].ts`, lib: `src/lib/[utility].ts`
