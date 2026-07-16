import { Streamdown } from 'streamdown';
import type { UIMessage } from 'ai';

interface MessageProps {
  message: UIMessage;
}

export function Message({ message }: MessageProps) {
  const text = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');

  if (!text) return null;

  if (message.role === 'user') {
    return (
      <div className="ml-auto max-w-[75%] rounded-3xl bg-primary px-4 py-2 text-sm text-primary-foreground whitespace-pre-wrap">
        {text}
      </div>
    );
  }

  return (
    <div className="max-w-[75%] rounded-3xl bg-muted px-4 py-2 text-sm text-foreground">
      <Streamdown>{text}</Streamdown>
    </div>
  );
}
