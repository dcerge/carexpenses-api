// ./src/weatherClient.ts
import { createWeatherGateway } from './gateways/apis/weather';
import { redisClient } from './redisClient';
import config from './config';
import { logger } from './logger';

/**
 * Weather Gateway Client
 *
 * Provides weather data from Google Weather API (primary) and
 * OpenWeatherMap (fallback for historical data > 24 hours).
 *
 * Features:
 * - Automatic provider selection based on record date
 * - Redis caching for performance and rate limiting
 * - Graceful fallback if primary provider fails
 *
 * Required env vars (add to .env):
 * - GOOGLE_MAPS_API_KEY (or GOOGLE_WEATHER_API_KEY)
 * - OPENWEATHERMAP_API_KEY (optional, for historical > 24h)
 * - WEATHER_DEFAULT_PROVIDER (optional, default: 'google')
 * - WEATHER_CACHE_TTL (optional, default: 1800 seconds)
 */

// Config properties are auto-camelCased from env vars by buildConfig
const googleApiKey = config.googleMapsApiKey || config.googleWeatherApiKey;
const openWeatherMapApiKey = config.openweathermapApiKey;
const defaultProvider = config.weatherDefaultProvider || 'google';
const cacheTtl = config.weatherCacheTtl ? parseInt(config.weatherCacheTtl, 10) : 1800;

console.log('=== googleApiKey', googleApiKey)

const weatherGateway = googleApiKey || openWeatherMapApiKey
  ? createWeatherGateway(
    {
      googleApiKey,
      openWeatherMapApiKey,
      defaultProvider: defaultProvider as 'google' | 'openweathermap',
      cacheTtlSeconds: cacheTtl,
    },
    redisClient
  )
  : null;

if (weatherGateway) {
  const providers = weatherGateway.getAvailableProviders();
  logger.log(`Weather gateway initialized with providers: ${providers.join(', ')}`);
} else {
  logger.log('Weather gateway not initialized (no API keys configured)');
}

export { weatherGateway };