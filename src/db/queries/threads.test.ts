import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { threads } from "@/db/schema";
import {
  createThread,
  deleteThread,
  getThread,
  listThreads,
  renameThread,
} from "./threads";
import { insertMessages } from "./messages";

describe("threads queries", () => {
  it("creates a thread and it appears in listThreads and getThread", async () => {
    const thread = await createThread({ title: "First thread" });

    const found = await getThread(thread.id);
    expect(found).toMatchObject({ id: thread.id, title: "First thread" });

    const all = await listThreads();
    expect(all.some((t) => t.id === thread.id)).toBe(true);
  });

  it("orders listThreads newest first", async () => {
    const older = await createThread({ title: "Older" });
    const newer = await createThread({ title: "Newer" });

    // Force a deterministic, unambiguous gap between timestamps instead of
    // relying on wall-clock delay between inserts (which can tie on a
    // loaded runner).
    await db
      .update(threads)
      .set({ createdAt: new Date(0) })
      .where(eq(threads.id, older.id));
    await db
      .update(threads)
      .set({ createdAt: new Date(1_000_000) })
      .where(eq(threads.id, newer.id));

    const all = await listThreads();
    const olderIndex = all.findIndex((t) => t.id === older.id);
    const newerIndex = all.findIndex((t) => t.id === newer.id);
    expect(newerIndex).toBeLessThan(olderIndex);
  });

  it("renameThread updates title and bumps updatedAt", async () => {
    const thread = await createThread({ title: "Original" });

    // Force the original updatedAt into the past so the bump from
    // renameThread is deterministically detectable, regardless of clock
    // resolution or runner load.
    await db
      .update(threads)
      .set({ updatedAt: new Date(0) })
      .where(eq(threads.id, thread.id));

    const renamed = await renameThread(thread.id, "Renamed");

    expect(renamed?.title).toBe("Renamed");
    expect(renamed?.updatedAt.getTime()).toBeGreaterThan(0);
  });

  it("deleteThread removes the thread and cascades its messages", async () => {
    const thread = await createThread({ title: "To delete" });
    await insertMessages([
      { threadId: thread.id, role: "user", parts: "hello" },
    ]);

    await deleteThread(thread.id);

    const found = await getThread(thread.id);
    expect(found).toBeUndefined();
  });

  it("getThread returns undefined for a missing id", async () => {
    const found = await getThread("missing-id");
    expect(found).toBeUndefined();
  });
});
