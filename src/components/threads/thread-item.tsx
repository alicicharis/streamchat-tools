'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DotsThreeIcon,
  PencilSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RenameDialog } from '@/components/threads/rename-dialog';
import { DeleteDialog } from '@/components/threads/delete-dialog';
import type { threads } from '@/db/schema';

type Thread = typeof threads.$inferSelect;

interface ThreadItemProps {
  thread: Thread;
}

export function ThreadItem({ thread }: ThreadItemProps) {
  const pathname = usePathname();
  const isActive = pathname === `/chat/${thread.id}`;
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-muted',
        isActive && 'bg-muted',
      )}
    >
      <Link
        href={`/chat/${thread.id}`}
        className="min-w-0 flex-1 truncate text-sm"
        title={thread.title}
      >
        {thread.title}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 opacity-0 group-hover:opacity-100 data-[popup-open]:opacity-100"
            />
          }
        >
          <DotsThreeIcon />
          <span className="sr-only">Thread options</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <PencilSimpleIcon />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <TrashIcon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameDialog
        threadId={thread.id}
        currentTitle={thread.title}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
      <DeleteDialog
        threadId={thread.id}
        threadTitle={thread.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
