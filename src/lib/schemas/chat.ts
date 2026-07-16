import { z } from 'zod';
import { MODEL_IDS } from '@/lib/models';

export const chatRequestSchema = z.object({
  threadId: z.uuid(),
  message: z.string().trim().min(1).max(8000),
  model: z.enum(MODEL_IDS),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
