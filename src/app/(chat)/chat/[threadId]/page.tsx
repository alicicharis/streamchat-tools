import { notFound } from 'next/navigation';
import { Chat } from '@/components/chat/chat';
import { getThread } from '@/db/queries/threads';
import { getMessagesByThread } from '@/db/queries/messages';
import { toUIMessages } from '@/lib/chat-messages';

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;
  const thread = await getThread(threadId);

  if (!thread) {
    notFound();
  }

  const rows = await getMessagesByThread(threadId);
  const initialMessages = toUIMessages(rows);

  return <Chat threadId={threadId} initialMessages={initialMessages} />;
}
