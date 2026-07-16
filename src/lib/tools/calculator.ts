import { tool } from 'ai';
import { z } from 'zod';
import { evaluate } from '@/lib/expression-parser';

export const calculator = tool({
  description:
    'Evaluate an arithmetic expression (+, -, *, /, ^, parentheses, decimals) and return the numeric result.',
  inputSchema: z.object({
    expression: z
      .string()
      .min(1)
      .max(200)
      .describe('The arithmetic expression to evaluate, e.g. "2 + 3 * 4"'),
  }),
  execute: async ({ expression }) => {
    const result = evaluate(expression);
    return { expression, result };
  },
});
