'use client';

import { useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ModelPicker } from '@/components/chat/model-picker';
import type { ModelId } from '@/lib/models';

interface ChatInputProps {
  onSend: (text: string) => Promise<boolean>;
  disabled?: boolean;
  model: ModelId;
  onModelChange: (model: ModelId) => void;
}

export function ChatInput({
  onSend,
  disabled,
  model,
  onModelChange,
}: ChatInputProps) {
  const [value, setValue] = useState('');

  const submit = async () => {
    const text = value.trim();
    if (!text || disabled) return;
    const sent = await onSend(text);
    if (sent) {
      setValue('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Send a message..."
        rows={1}
        className="min-h-9 flex-1 resize-none rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <ModelPicker value={model} onChange={onModelChange} disabled={disabled} />
      <Button type="submit" disabled={disabled || !value.trim()}>
        Send
      </Button>
    </form>
  );
}
