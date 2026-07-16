import { z } from 'zod';

export const createThreadSchema = z.object({
  message: z.string().trim().min(1).max(8000),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
