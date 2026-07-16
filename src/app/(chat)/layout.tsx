import { ThreadSidebar } from '@/components/threads/thread-sidebar';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh">
      <ThreadSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
