import { afterEach, describe, expect, it, vi } from 'vitest';
import { currency } from './currency';

const toolOptions = { toolCallId: 'test', messages: [], context: {} };

describe('currency tool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('converts a valid amount', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              amount: 100,
              base: 'EUR',
              date: '2026-07-15',
              rates: { USD: 108.55 },
            }),
            { status: 200 },
          ),
      ),
    );

    const result = await currency.execute!(
      { amount: 100, from: 'eur', to: 'usd' },
      toolOptions,
    );

    expect(result).toEqual({
      amount: 100,
      from: 'EUR',
      to: 'USD',
      converted: 108.55,
      rateDate: '2026-07-15',
    });
  });

  it('throws when the exchange rate service errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('error', { status: 500 })),
    );

    await expect(
      currency.execute!({ amount: 100, from: 'EUR', to: 'USD' }, toolOptions),
    ).rejects.toThrow(/exchange rate service returned 500/i);
  });

  it('throws for an unknown currency code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              amount: 100,
              base: 'EUR',
              date: '2026-07-15',
              rates: {},
            }),
            { status: 200 },
          ),
      ),
    );

    await expect(
      currency.execute!({ amount: 100, from: 'EUR', to: 'ZZZ' }, toolOptions),
    ).rejects.toThrow(/unknown or unsupported currency/i);
  });
});
