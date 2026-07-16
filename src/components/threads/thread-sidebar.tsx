import Link from 'next/link';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { listThreads } from '@/db/queries/threads';
import { ThreadItem } from '@/components/threads/thread-item';

export async function ThreadSidebar() {
  const threads = await listThreads();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r">
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full justify-start"
          render={<Link href="/" />}
          nativeButton={false}
        >
          <PlusIcon />
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {threads.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No threads yet
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {threads.map((thread) => (
              <li key={thread.id}>
                <ThreadItem thread={thread} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
