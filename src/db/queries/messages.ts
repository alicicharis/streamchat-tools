import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";

type MessageInsert = typeof messages.$inferInsert;

export async function getMessagesByThread(threadId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(asc(messages.createdAt), asc(sql`rowid`));
}

export async function insertMessages(data: MessageInsert[]) {
  return db.insert(messages).values(data).returning();
}
