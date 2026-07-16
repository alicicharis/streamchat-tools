import { tool } from 'ai';
import { z } from 'zod';

interface FrankfurterResult {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export const currency = tool({
  description:
    'Convert an amount from one currency to another using current exchange rates.',
  inputSchema: z.object({
    amount: z.number().positive().finite().max(1_000_000_000),
    from: z
      .string()
      .length(3)
      .describe('3-letter ISO currency code to convert from, e.g. "EUR"'),
    to: z
      .string()
      .length(3)
      .describe('3-letter ISO currency code to convert to, e.g. "USD"'),
  }),
  execute: async ({ amount, from, to }) => {
    const fromCode = from.toUpperCase();
    const toCode = to.toUpperCase();

    const response = await fetch(
      `https://api.frankfurter.dev/v1/latest?amount=${amount}&from=${fromCode}&to=${toCode}`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!response.ok) {
      throw new Error(
        `Currency conversion failed: exchange rate service returned ${response.status}`,
      );
    }

    const data = (await response.json()) as FrankfurterResult;
    const converted = data.rates?.[toCode];

    if (converted === undefined) {
      throw new Error(`Unknown or unsupported currency code "${toCode}"`);
    }

    return {
      amount,
      from: fromCode,
      to: toCode,
      converted,
      rateDate: data.date,
    };
  },
});
