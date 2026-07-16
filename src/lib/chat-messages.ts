import type { UIMessagePart, UIDataTypes, UITools } from 'ai';
import type { messages } from '@/db/schema';
import type { ModelId } from '@/lib/models';
import type { ChatMessageMetadata, ChatUIMessage } from '@/types/chat';

type MessageRow = typeof messages.$inferSelect;

/**
 * Maps DB message rows to `ChatUIMessage[]`. This is the sole place `parts`
 * JSON is parsed - route handlers and pages must go through this function.
 */
export function toUIMessages(rows: MessageRow[]): ChatUIMessage[] {
  return rows.map((row) => {
    const metadata: ChatMessageMetadata | undefined =
      row.model !== null &&
      row.inputTokens !== null &&
      row.outputTokens !== null
        ? {
            model: row.model as ModelId,
            inputTokens: row.inputTokens,
            outputTokens: row.outputTokens,
          }
        : undefined;

    return {
      id: row.id,
      role: row.role,
      parts: JSON.parse(row.parts) as UIMessagePart<UIDataTypes, UITools>[],
      metadata,
    };
  });
}
