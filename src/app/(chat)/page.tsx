import { Chat } from '@/components/chat/chat';
import { createThreadAction } from '@/actions/threads';

export default function NewChatPage() {
  return (
    <Chat threadId={null} initialMessages={[]} onFirstSend={handleFirstSend} />
  );
}

async function handleFirstSend(
  text: string,
): Promise<{ id: string } | { error: string }> {
  const result = await createThreadAction(text);

  if (result.success && result.data) {
    return { id: result.data.id };
  }

  return { error: result.error ?? 'Failed to create thread' };
}
