import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from 'ai';
import type { messages } from '@/db/schema';

type MessageRow = typeof messages.$inferSelect;

/**
 * Maps DB message rows to `UIMessage[]`. This is the sole place `parts` JSON
 * is parsed - route handlers and pages must go through this function.
 */
export function toUIMessages(rows: MessageRow[]): UIMessage[] {
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: JSON.parse(row.parts) as UIMessagePart<UIDataTypes, UITools>[],
  }));
}
