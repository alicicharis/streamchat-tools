'use server';

import { createThreadSchema } from '@/lib/schemas/threads';
import { deriveThreadTitle } from '@/lib/thread-title';
import { createThread as createThreadQuery } from '@/db/queries/threads';

interface ActionResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function createThreadAction(
  message: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createThreadSchema.safeParse({ message });

  if (!parsed.success) {
    return {
      success: false,
      data: null,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  const title = deriveThreadTitle(parsed.data.message);
  const thread = await createThreadQuery({ title });

  return { success: true, data: { id: thread.id }, error: null };
}
