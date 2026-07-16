import { tool } from 'ai';
import { z } from 'zod';

const WMO_CODES: Record<number, string> = {
  0: 'clear sky',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'depositing rime fog',
  51: 'light drizzle',
  53: 'moderate drizzle',
  55: 'dense drizzle',
  56: 'light freezing drizzle',
  57: 'dense freezing drizzle',
  61: 'slight rain',
  63: 'moderate rain',
  65: 'heavy rain',
  66: 'light freezing rain',
  67: 'heavy freezing rain',
  71: 'slight snow fall',
  73: 'moderate snow fall',
  75: 'heavy snow fall',
  77: 'snow grains',
  80: 'slight rain showers',
  81: 'moderate rain showers',
  82: 'violent rain showers',
  85: 'slight snow showers',
  86: 'heavy snow showers',
  95: 'thunderstorm',
  96: 'thunderstorm with slight hail',
  99: 'thunderstorm with heavy hail',
};

interface GeocodingResult {
  results?: {
    latitude: number;
    longitude: number;
    name: string;
    country: string;
  }[];
}

interface ForecastResult {
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
}

export const weather = tool({
  description: 'Get the current weather for a named location.',
  inputSchema: z.object({
    location: z
      .string()
      .min(1)
      .max(100)
      .describe('City or place name, e.g. "Berlin"'),
  }),
  execute: async ({ location }) => {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!geoResponse.ok) {
      throw new Error(
        `Weather lookup failed: geocoding service returned ${geoResponse.status}`,
      );
    }

    const geoData = (await geoResponse.json()) as GeocodingResult;
    const place = geoData.results?.[0];

    if (!place) {
      throw new Error(`Could not find a location matching "${location}"`);
    }

    const forecastResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!forecastResponse.ok) {
      throw new Error(
        `Weather lookup failed: forecast service returned ${forecastResponse.status}`,
      );
    }

    const forecastData = (await forecastResponse.json()) as ForecastResult;
    const current = forecastData.current;

    if (!current) {
      throw new Error(`No current weather data available for "${location}"`);
    }

    return {
      location: place.name,
      country: place.country,
      temperatureC: current.temperature_2m,
      condition: WMO_CODES[current.weather_code] ?? 'unknown',
      windSpeedKmh: current.wind_speed_10m,
      humidityPercent: current.relative_humidity_2m,
    };
  },
});
