import type { UIMessage } from 'ai';
import type { ModelId } from '@/lib/models';

export interface ChatMessageMetadata {
  model: ModelId;
  inputTokens: number;
  outputTokens: number;
}

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;
