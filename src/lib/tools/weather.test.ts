import { afterEach, describe, expect, it, vi } from 'vitest';
import { weather } from './weather';

const toolOptions = { toolCallId: 'test', messages: [] };

describe('weather tool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns weather for a valid location', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('geocoding-api')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                latitude: 52.52,
                longitude: 13.41,
                name: 'Berlin',
                country: 'Germany',
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          current: {
            temperature_2m: 18,
            relative_humidity_2m: 60,
            wind_speed_10m: 10,
            weather_code: 2,
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await weather.execute!({ location: 'Berlin' }, toolOptions);

    expect(result).toEqual({
      location: 'Berlin',
      country: 'Germany',
      temperatureC: 18,
      condition: 'partly cloudy',
      windSpeedKmh: 10,
      humidityPercent: 60,
    });
  });

  it('throws when geocoding returns no results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ results: [] }), { status: 200 }),
      ),
    );

    await expect(
      weather.execute!({ location: 'Xyzzyville' }, toolOptions),
    ).rejects.toThrow(/could not find/i);
  });

  it('throws when the geocoding service errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('error', { status: 500 })),
    );

    await expect(
      weather.execute!({ location: 'Berlin' }, toolOptions),
    ).rejects.toThrow(/geocoding service returned 500/i);
  });
});
