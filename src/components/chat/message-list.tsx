'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { Message } from './message';

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, isStreaming]);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
