/**
 * Weather Gateway
 *
 * Composite gateway that delegates to Google Weather API or OpenWeatherMap
 * based on configuration, request parameters, and data availability.
 *
 * Features:
 * - Provider selection via request parameter
 * - Automatic fallback when primary provider fails
 * - Redis caching for rate limiting and performance
 * - Smart historical data routing (Google: 24h, OpenWeatherMap: years)
 */

import { GoogleWeatherGateway } from './GoogleWeatherGateway';
import { OpenWeatherMapGateway } from './OpenWeatherMapGateway';
import {
  IWeatherProviderGateway,
  RedisClientLike,
  WeatherData,
  WeatherGatewayConfig,
  WeatherLocation,
  WeatherProvider,
  WeatherRequest,
} from './weatherTypes';

const DEFAULT_CACHE_TTL_SECONDS = 1800; // 30 minutes

export class WeatherGateway {
  private readonly providers: Map<WeatherProvider, IWeatherProviderGateway>;
  private readonly defaultProvider: WeatherProvider;
  private readonly redis: RedisClientLike | null;
  private readonly cacheTtl: number;

  constructor(config: WeatherGatewayConfig, redis?: RedisClientLike | null) {
    this.providers = new Map();
    this.defaultProvider = config.defaultProvider;
    this.redis = redis ?? null;
    this.cacheTtl = config.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;

    // Initialize configured providers
    if (config.google?.apiKey) {
      this.providers.set('google', new GoogleWeatherGateway(config.google));
    }

    if (config.openWeatherMap?.apiKey) {
      this.providers.set(
        'openweathermap',
        new OpenWeatherMapGateway(config.openWeatherMap)
      );
    }

    if (this.providers.size === 0) {
      throw new Error('At least one weather provider must be configured');
    }

    if (!this.providers.has(this.defaultProvider)) {
      throw new Error(
        `Default provider "${this.defaultProvider}" is not configured`
      );
    }
  }

  /**
   * Fetch weather data for a location
   *
   * @param request - Weather request with location, optional timestamp, and provider preference
   * @returns Weather data or null if unavailable
   */
  async fetchWeather(request: WeatherRequest): Promise<WeatherData | null> {
    const { location, recordedAt, provider } = request;

    // Validate coordinates
    if (!this.isValidLocation(location)) {
      console.warn('Invalid coordinates provided to WeatherGateway');
      return null;
    }

    // Check cache first
    const cacheKey = this.buildCacheKey(location, recordedAt);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Determine which provider to use
    const selectedProvider = this.selectProvider(provider, recordedAt);
    const weatherData = await this.fetchFromProvider(
      selectedProvider,
      location,
      recordedAt
    );

    // If primary provider fails, try fallback
    if (!weatherData) {
      const fallbackData = await this.tryFallbackProviders(
        selectedProvider,
        location,
        recordedAt
      );

      if (fallbackData) {
        await this.setInCache(cacheKey, fallbackData);
        return fallbackData;
      }

      return null;
    }

    // Cache successful result
    await this.setInCache(cacheKey, weatherData);

    return weatherData;
  }

  /**
   * Fetch current weather (convenience method)
   */
  async fetchCurrent(
    location: WeatherLocation,
    provider?: WeatherProvider
  ): Promise<WeatherData | null> {
    return this.fetchWeather({ location, provider });
  }

  /**
   * Fetch historical weather (convenience method)
   */
  async fetchHistorical(
    location: WeatherLocation,
    recordedAt: Date,
    provider?: WeatherProvider
  ): Promise<WeatherData | null> {
    return this.fetchWeather({ location, recordedAt, provider });
  }

  /**
   * Check which providers are available
   */
  getAvailableProviders(): WeatherProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider supports historical data for the given date
   */
  supportsHistorical(recordedAt: Date, provider?: WeatherProvider): boolean {
    const targetProvider = provider ?? this.defaultProvider;
    const gateway = this.providers.get(targetProvider);
    return gateway?.supportsHistorical(recordedAt) ?? false;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private selectProvider(
    requestedProvider: WeatherProvider | undefined,
    recordedAt: Date | undefined
  ): WeatherProvider {
    // If specific provider requested and available, use it
    if (requestedProvider && this.providers.has(requestedProvider)) {
      return requestedProvider;
    }

    // For historical data, prefer OpenWeatherMap (better historical support)
    if (recordedAt && this.isHistorical(recordedAt)) {
      const hoursAgo = (Date.now() - recordedAt.getTime()) / (1000 * 60 * 60);

      // If within Google's 24-hour limit and Google is available
      if (hoursAgo <= 24 && this.providers.has('google')) {
        return 'google';
      }

      // For older data, prefer OpenWeatherMap if available
      if (this.providers.has('openweathermap')) {
        return 'openweathermap';
      }
    }

    return this.defaultProvider;
  }

  private async fetchFromProvider(
    provider: WeatherProvider,
    location: WeatherLocation,
    recordedAt: Date | undefined
  ): Promise<WeatherData | null> {
    const gateway = this.providers.get(provider);

    if (!gateway) {
      console.error(`Weather provider "${provider}" not configured`);
      return null;
    }

    try {
      if (recordedAt && this.isHistorical(recordedAt)) {
        return await gateway.fetchHistorical(location, recordedAt);
      }
      return await gateway.fetchCurrent(location);
    } catch (error) {
      console.error(`Weather fetch from ${provider} failed:`, error);
      return null;
    }
  }

  private async tryFallbackProviders(
    excludeProvider: WeatherProvider,
    location: WeatherLocation,
    recordedAt: Date | undefined
  ): Promise<WeatherData | null> {
    for (const [providerName, gateway] of this.providers) {
      if (providerName === excludeProvider) {
        continue;
      }

      // Skip providers that don't support the historical date
      if (recordedAt && !gateway.supportsHistorical(recordedAt)) {
        continue;
      }

      try {
        const data = await this.fetchFromProvider(
          providerName,
          location,
          recordedAt
        );

        if (data) {
          console.info(`Weather fallback to ${providerName} succeeded`);
          return data;
        }
      } catch (error) {
        console.warn(`Weather fallback to ${providerName} failed:`, error);
      }
    }

    return null;
  }

  private isHistorical(recordedAt: Date): boolean {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return recordedAt.getTime() < oneHourAgo;
  }

  private isValidLocation(location: WeatherLocation): boolean {
    const { latitude, longitude } = location;

    if (latitude == null || longitude == null) {
      return false;
    }

    if (latitude < -90 || latitude > 90) {
      return false;
    }

    if (longitude < -180 || longitude > 180) {
      return false;
    }

    return true;
  }

  // ===========================================================================
  // CACHING
  // ===========================================================================

  private buildCacheKey(
    location: WeatherLocation,
    recordedAt: Date | undefined
  ): string {
    // Round coordinates to ~1km precision for better cache hits
    const latRound = Math.round(location.latitude * 100) / 100;
    const lonRound = Math.round(location.longitude * 100) / 100;

    // For current weather, use hour bucket
    // For historical, use the specific hour
    const timeBucket = recordedAt
      ? Math.floor(recordedAt.getTime() / 3600000)
      : `current-${Math.floor(Date.now() / 3600000)}`;

    return `weather:${latRound}:${lonRound}:${timeBucket}`;
  }

  private async getFromCache(key: string): Promise<WeatherData | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const data = JSON.parse(cached) as WeatherData;
        // Restore Date object
        data.fetchedAt = new Date(data.fetchedAt);
        return data;
      }
    } catch (error) {
      console.warn('Weather cache read failed:', error);
    }

    return null;
  }

  private async setInCache(key: string, data: WeatherData): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      // redis v5 uses setEx(key, ttl, value)
      await this.redis.setEx(key, this.cacheTtl, JSON.stringify(data));
    } catch (error) {
      console.warn('Weather cache write failed:', error);
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a WeatherGateway with common configuration
 *
 * @example
 * ```typescript
 * import { redisClient } from './redisClient';
 *
 * const weatherGateway = createWeatherGateway({
 *   googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
 *   openWeatherMapApiKey: process.env.OPENWEATHERMAP_API_KEY,
 *   defaultProvider: 'google',
 * }, redisClient);
 * ```
 */
export function createWeatherGateway(
  options: {
    googleApiKey?: string;
    openWeatherMapApiKey?: string;
    defaultProvider?: WeatherProvider;
    cacheTtlSeconds?: number;
  },
  redis?: RedisClientLike | null
): WeatherGateway {
  const config: WeatherGatewayConfig = {
    defaultProvider: options.defaultProvider ?? 'google',
    cacheTtlSeconds: options.cacheTtlSeconds,
  };

  if (options.googleApiKey) {
    config.google = { apiKey: options.googleApiKey };
  }

  if (options.openWeatherMapApiKey) {
    config.openWeatherMap = { apiKey: options.openWeatherMapApiKey };
  }

  // If only one provider configured, make it the default
  if (!options.googleApiKey && options.openWeatherMapApiKey) {
    config.defaultProvider = 'openweathermap';
  } else if (options.googleApiKey && !options.openWeatherMapApiKey) {
    config.defaultProvider = 'google';
  }

  return new WeatherGateway(config, redis);
}