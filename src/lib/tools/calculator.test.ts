import { describe, expect, it } from 'vitest';
import { calculator } from './calculator';

describe('calculator tool', () => {
  it('evaluates a valid expression', async () => {
    const result = await calculator.execute!(
      { expression: '2 + 3 * 4' },
      { toolCallId: 'test', messages: [] },
    );
    expect(result).toEqual({ expression: '2 + 3 * 4', result: 14 });
  });

  it('rejects an invalid expression', async () => {
    await expect(
      calculator.execute!(
        { expression: '1 / 0' },
        { toolCallId: 'test', messages: [] },
      ),
    ).rejects.toThrow();
  });
});
