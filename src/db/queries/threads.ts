import { eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { threads } from '@/db/schema';

type ThreadInsert = typeof threads.$inferInsert;

export async function listThreads() {
  return db.select().from(threads).orderBy(desc(threads.updatedAt));
}

export async function getThread(id: string) {
  const [thread] = await db.select().from(threads).where(eq(threads.id, id));
  return thread;
}

export async function createThread(data: Pick<ThreadInsert, 'title'>) {
  const [thread] = await db.insert(threads).values(data).returning();
  return thread;
}

export async function renameThread(id: string, title: string) {
  const [thread] = await db
    .update(threads)
    .set({ title, updatedAt: new Date() })
    .where(eq(threads.id, id))
    .returning();
  return thread;
}

export async function deleteThread(id: string) {
  await db.delete(threads).where(eq(threads.id, id));
}

export async function touchThread(id: string) {
  await db
    .update(threads)
    .set({ updatedAt: new Date() })
    .where(eq(threads.id, id));
}
