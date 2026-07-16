'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DEFAULT_MODEL_ID, type ModelId } from '@/lib/models';
import { ChatInput } from '@/components/chat/chat-input';
import { MessageList } from '@/components/chat/message-list';
import { ModelPicker } from '@/components/chat/model-picker';
import { createThreadAction } from '@/actions/threads';

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

interface ChatProps {
  threadId: string | null;
  initialMessages: UIMessage[];
}

function createTransport() {
  return new DefaultChatTransport<UIMessage>({
    prepareSendMessagesRequest: ({ messages, body }) => {
      const lastMessage = messages[messages.length - 1];
      return {
        body: {
          ...body,
          message: lastMessage ? getMessageText(lastMessage) : '',
        },
      };
    },
  });
}

export function Chat({ threadId, initialMessages }: ChatProps) {
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [resolvedThreadId, setResolvedThreadId] = useState(threadId);
  const [transport] = useState(createTransport);

  const { messages, sendMessage, status, error, regenerate, clearError } =
    useChat<UIMessage>({
      id: threadId ?? undefined,
      messages: initialMessages,
      transport,
      onError: (chatError) => {
        toast.error(chatError.message || 'Something went wrong');
      },
    });

  const isStreaming = status === 'submitted' || status === 'streaming';

  const handleSend = async (text: string): Promise<boolean> => {
    let currentThreadId = resolvedThreadId;

    if (!currentThreadId) {
      const result = await createThreadAction(text);
      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Failed to create thread');
        return false;
      }
      currentThreadId = result.data.id;
      setResolvedThreadId(currentThreadId);
      window.history.replaceState(null, '', `/chat/${currentThreadId}`);
    }

    await sendMessage({ text }, { body: { threadId: currentThreadId, model } });
    return true;
  };

  const handleRetry = () => {
    if (!resolvedThreadId) return;
    clearError();
    regenerate({ body: { threadId: resolvedThreadId, model } });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <ModelPicker value={model} onChange={setModel} disabled={isStreaming} />
      </div>
      <MessageList messages={messages} isStreaming={isStreaming} />
      {error ? (
        <div className="flex items-center justify-between gap-2 border-t p-3 text-sm text-destructive">
          <span>Failed to get a response.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetry}
          >
            Retry
          </Button>
        </div>
      ) : null}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
