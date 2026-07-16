import { Streamdown } from 'streamdown';
import {
  isStaticToolUIPart,
  type InferUITools,
  type ToolUIPart,
  type UIMessage,
} from 'ai';
import { ToolCard } from '@/components/chat/tool-card';
import { tools } from '@/lib/tools';

type ChatToolUIPart = ToolUIPart<InferUITools<typeof tools>>;

interface MessageProps {
  message: UIMessage;
}

export function Message({ message }: MessageProps) {
  const hasContent = message.parts.some(
    (part) => part.type === 'text' || isStaticToolUIPart(part),
  );

  if (!hasContent) return null;

  const wrapperClassName =
    message.role === 'user'
      ? 'ml-auto flex max-w-[75%] flex-col gap-2'
      : 'flex max-w-[75%] flex-col gap-2';

  return (
    <div className={wrapperClassName}>
      {message.parts.map((part, index) => {
        if (part.type === 'text') {
          if (message.role === 'user') {
            return (
              <div
                key={index}
                className="rounded-3xl bg-primary px-4 py-2 text-sm text-primary-foreground whitespace-pre-wrap"
              >
                {part.text}
              </div>
            );
          }

          return (
            <div
              key={index}
              className="rounded-3xl bg-muted px-4 py-2 text-sm text-foreground"
            >
              <Streamdown>{part.text}</Streamdown>
            </div>
          );
        }

        if (isStaticToolUIPart(part)) {
          // The chat route only ever registers the `tools` set below, so
          // any static tool part streamed to this UI matches its shape.
          return <ToolCard key={index} part={part as ChatToolUIPart} />;
        }

        return null;
      })}
    </div>
  );
}
