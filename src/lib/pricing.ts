import type { ModelId } from './models';

export const PRICING: Record<
  ModelId,
  { inputPerMTok: number; outputPerMTok: number }
> = {
  'claude-opus-4-8': { inputPerMTok: 5, outputPerMTok: 25 },
  'claude-sonnet-5': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
};

export function computeCost(
  model: ModelId,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = PRICING[model];
  return (
    (inputTokens / 1_000_000) * rates.inputPerMTok +
    (outputTokens / 1_000_000) * rates.outputPerMTok
  );
}

export function formatCost(cost: number): string {
  const digits = cost < 1 ? 4 : 2;
  return `$${cost.toFixed(digits)}`;
}
