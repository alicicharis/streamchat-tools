import { z } from 'zod';

export const createThreadSchema = z.object({
  message: z.string().trim().min(1).max(8000),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;

export const renameThreadSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
});

export type RenameThreadInput = z.infer<typeof renameThreadSchema>;

export const deleteThreadSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteThreadInput = z.infer<typeof deleteThreadSchema>;
