import { describe, expect, it } from 'vitest';
import { computeCost, formatCost } from './pricing';

describe('computeCost', () => {
  it('computes cost for claude-opus-4-8', () => {
    expect(computeCost('claude-opus-4-8', 1_000_000, 1_000_000)).toBe(30);
  });

  it('computes cost for claude-sonnet-5', () => {
    expect(computeCost('claude-sonnet-5', 1_000_000, 1_000_000)).toBe(18);
  });

  it('computes cost for claude-haiku-4-5', () => {
    expect(computeCost('claude-haiku-4-5', 1_000_000, 1_000_000)).toBe(6);
  });

  it('returns 0 for zero tokens', () => {
    expect(computeCost('claude-sonnet-5', 0, 0)).toBe(0);
  });

  it('scales linearly with token counts', () => {
    expect(computeCost('claude-haiku-4-5', 100, 200)).toBeCloseTo(
      (100 / 1_000_000) * 1 + (200 / 1_000_000) * 5,
    );
  });
});

describe('formatCost', () => {
  it('uses 4 fraction digits below $1', () => {
    expect(formatCost(0.0042)).toBe('$0.0042');
  });

  it('never rounds sub-cent costs to $0.00', () => {
    expect(formatCost(0.0001)).toBe('$0.0001');
  });

  it('uses 2 fraction digits at $1 or above', () => {
    expect(formatCost(1)).toBe('$1.00');
    expect(formatCost(1.2345)).toBe('$1.23');
  });

  it('formats zero cost', () => {
    expect(formatCost(0)).toBe('$0.0000');
  });
});
