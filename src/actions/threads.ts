'use server';

import { revalidatePath } from 'next/cache';
import {
  createThreadSchema,
  renameThreadSchema,
  deleteThreadSchema,
} from '@/lib/schemas/threads';
import { deriveThreadTitle } from '@/lib/thread-title';
import {
  createThread as createThreadQuery,
  getThread as getThreadQuery,
  renameThread as renameThreadQuery,
  deleteThread as deleteThreadQuery,
} from '@/db/queries/threads';

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

  revalidatePath('/', 'layout');

  return { success: true, data: { id: thread.id }, error: null };
}

export async function renameThreadAction(
  id: string,
  title: string,
): Promise<ActionResult<{ id: string; title: string }>> {
  const parsed = renameThreadSchema.safeParse({ id, title });

  if (!parsed.success) {
    return {
      success: false,
      data: null,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  const thread = await renameThreadQuery(parsed.data.id, parsed.data.title);

  if (!thread) {
    return { success: false, data: null, error: 'Thread not found' };
  }

  revalidatePath('/', 'layout');

  return {
    success: true,
    data: { id: thread.id, title: thread.title },
    error: null,
  };
}

export async function deleteThreadAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = deleteThreadSchema.safeParse({ id });

  if (!parsed.success) {
    return {
      success: false,
      data: null,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  const existing = await getThreadQuery(parsed.data.id);

  if (!existing) {
    return { success: false, data: null, error: 'Thread not found' };
  }

  await deleteThreadQuery(parsed.data.id);

  revalidatePath('/', 'layout');

  return { success: true, data: { id: parsed.data.id }, error: null };
}
