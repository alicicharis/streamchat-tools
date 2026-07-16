'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteThreadAction } from '@/actions/threads';

interface DeleteDialogProps {
  threadId: string;
  threadTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDialog({
  threadId,
  threadTitle,
  open,
  onOpenChange,
}: DeleteDialogProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteThreadAction(threadId);
    setIsDeleting(false);

    if (!result.success) {
      toast.error(result.error ?? 'Failed to delete thread');
      return;
    }

    toast.success('Thread deleted');
    onOpenChange(false);

    if (pathname === `/chat/${threadId}`) {
      router.push('/');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{threadTitle}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this thread and all of its messages.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
