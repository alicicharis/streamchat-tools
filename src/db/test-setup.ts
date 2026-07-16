import { randomUUID } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll } from "vitest";

const dbFile = path.join(tmpdir(), `test-${randomUUID()}.db`);
process.env.DB_FILE_NAME = dbFile;

const { db } = await import("./index");
const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

migrate(db, { migrationsFolder: "./drizzle" });

afterAll(() => {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${dbFile}${suffix}`;
    if (existsSync(file)) unlinkSync(file);
  }
});
