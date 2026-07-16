import { anthropic } from '@ai-sdk/anthropic';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type LanguageModelUsage,
  type UIMessage,
} from 'ai';
import { getThread } from '@/db/queries/threads';
import { getMessagesByThread, insertMessages } from '@/db/queries/messages';
import { toUIMessages } from '@/lib/chat-messages';
import { chatRequestSchema } from '@/lib/schemas/chat';

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => undefined);
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { threadId, message, model } = parsed.data;

  const thread = await getThread(threadId);
  if (!thread) {
    return Response.json(
      { success: false, error: 'Thread not found' },
      { status: 404 },
    );
  }

  const priorMessages = toUIMessages(await getMessagesByThread(threadId));

  const userMessage: UIMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    parts: [{ type: 'text', text: message }],
  };

  const originalMessages = [...priorMessages, userMessage];

  let usage: LanguageModelUsage | undefined;

  const result = streamText({
    model: anthropic(model),
    messages: await convertToModelMessages(originalMessages),
    onError: (error) => {
      // Never log request bodies; log only the error for diagnostics.
      console.error('streamText error', error);
    },
    onEnd: (event) => {
      usage = event.usage;
    },
  });

  const uiMessageStream = toUIMessageStream({
    stream: result.stream,
    originalMessages,
    onError: () => 'The assistant failed to respond. Please try again.',
    onEnd: async ({ responseMessage, isAborted }) => {
      if (isAborted) return;

      await insertMessages([
        {
          threadId,
          role: 'user',
          parts: JSON.stringify(userMessage.parts),
        },
        {
          threadId,
          role: 'assistant',
          parts: JSON.stringify(responseMessage.parts),
          model,
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
        },
      ]);
    },
  });

  return createUIMessageStreamResponse({ stream: uiMessageStream });
}
