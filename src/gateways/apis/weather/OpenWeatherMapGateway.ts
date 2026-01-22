/**
 * OpenWeatherMap API Gateway
 * https://openweathermap.org/api
 *
 * Supports:
 * - Current conditions (free tier: 1,000 calls/day)
 * - Historical data (paid tier: One Call API 3.0)
 *
 * Note: Historical data requires a paid subscription to One Call API 3.0
 */

import {
  IWeatherProviderGateway,
  OpenWeatherMapConfig,
  OpenWeatherMapCurrentResponse,
  OpenWeatherMapHistoricalResponse,
  WeatherData,
  WeatherLocation,
  WeatherProvider,
} from './weatherTypes';

const DEFAULT_BASE_URL = 'https://api.openweathermap.org';
const ONE_CALL_BASE_URL = 'https://api.openweathermap.org/data/3.0';

// OpenWeatherMap historical data limit (depends on subscription)
// Free tier: no historical
// One Call 3.0: up to 45 years of historical data
const HISTORICAL_LIMIT_DAYS = 365 * 5; // 5 years as reasonable limit

export class OpenWeatherMapGateway implements IWeatherProviderGateway {
  public readonly provider: WeatherProvider = 'openweathermap';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly oneCallBaseUrl: string;

  constructor(config: OpenWeatherMapConfig) {
    if (!config.apiKey) {
      throw new Error('OpenWeatherMap API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.oneCallBaseUrl = ONE_CALL_BASE_URL;
  }

  /**
   * Fetch current weather conditions from OpenWeatherMap
   */
  async fetchCurrent(location: WeatherLocation): Promise<WeatherData | null> {
    try {
      const url = this.buildUrl(`${this.baseUrl}/data/2.5/weather`, {
        lat: location.latitude.toString(),
        lon: location.longitude.toString(),
        units: 'metric',
      });

      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `OpenWeatherMap API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data: OpenWeatherMapCurrentResponse = await response.json();
      return this.mapCurrentResponse(data);
    } catch (error) {
      console.error('OpenWeatherMap API fetch failed:', error);
      return null;
    }
  }

  /**
   * Fetch historical weather from OpenWeatherMap One Call API 3.0
   * Note: Requires paid subscription
   */
  async fetchHistorical(
    location: WeatherLocation,
    recordedAt: Date
  ): Promise<WeatherData | null> {
    if (!this.supportsHistorical(recordedAt)) {
      console.warn('OpenWeatherMap: Date too far in the past for historical data');
      return null;
    }

    try {
      const timestamp = Math.floor(recordedAt.getTime() / 1000);

      const url = this.buildUrl(`${this.oneCallBaseUrl}/onecall/timemachine`, {
        lat: location.latitude.toString(),
        lon: location.longitude.toString(),
        dt: timestamp.toString(),
        units: 'metric',
      });

      const response = await fetch(url);

      if (!response.ok) {
        // 401 usually means the API key doesn't have One Call 3.0 access
        if (response.status === 401) {
          console.warn(
            'OpenWeatherMap: Historical data requires One Call API 3.0 subscription'
          );
        } else {
          console.error(
            `OpenWeatherMap historical API error: ${response.status} ${response.statusText}`
          );
        }
        return null;
      }

      const data: OpenWeatherMapHistoricalResponse = await response.json();
      return this.mapHistoricalResponse(data, recordedAt);
    } catch (error) {
      console.error('OpenWeatherMap historical API fetch failed:', error);
      return null;
    }
  }

  /**
   * OpenWeatherMap supports historical data for several years (paid tier)
   */
  supportsHistorical(recordedAt: Date): boolean {
    const daysAgo =
      (Date.now() - recordedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= HISTORICAL_LIMIT_DAYS && daysAgo >= 0;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private buildUrl(baseUrl: string, params: Record<string, string>): string {
    const url = new URL(baseUrl);
    url.searchParams.set('appid', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }

  private mapCurrentResponse(data: OpenWeatherMapCurrentResponse): WeatherData {
    const weather = data.weather[0];

    return {
      tempC: data.main.temp,
      feelsLikeC: data.main.feels_like,
      conditionCode: this.normalizeConditionCode(weather?.main || 'unknown'),
      conditionIcon: this.buildIconUrl(weather?.icon || '01d'),
      description: weather?.description || '',
      humidityPct: data.main.humidity,
      pressureHpa: data.main.pressure,
      cloudPct: data.clouds?.all ?? 0,
      visibilityM: data.visibility ?? 10000,
      windSpeedMps: data.wind?.speed ?? 0, // Already in m/s with metric units
      windDirDeg: data.wind?.deg ?? 0,
      precipMm: this.extractPrecipitation(data),
      uvIndex: 0, // Not available in basic current weather endpoint
      provider: this.provider,
      fetchedAt: new Date(),
    };
  }

  private mapHistoricalResponse(
    data: OpenWeatherMapHistoricalResponse,
    targetTime: Date
  ): WeatherData | null {
    if (!data.data || data.data.length === 0) {
      return null;
    }

    const targetTimestamp = Math.floor(targetTime.getTime() / 1000);

    // Find the data point closest to the target time
    let closest = data.data[0];
    let closestDiff = Math.abs(closest.dt - targetTimestamp);

    for (const point of data.data) {
      const diff = Math.abs(point.dt - targetTimestamp);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = point;
      }
    }

    const weather = closest.weather[0];

    return {
      tempC: closest.temp,
      feelsLikeC: closest.feels_like,
      conditionCode: this.normalizeConditionCode(weather?.main || 'unknown'),
      conditionIcon: this.buildIconUrl(weather?.icon || '01d'),
      description: weather?.description || '',
      humidityPct: closest.humidity,
      pressureHpa: closest.pressure,
      cloudPct: closest.clouds ?? 0,
      visibilityM: closest.visibility ?? 10000,
      windSpeedMps: closest.wind_speed ?? 0,
      windDirDeg: closest.wind_deg ?? 0,
      precipMm: (closest.rain?.['1h'] ?? 0) + (closest.snow?.['1h'] ?? 0),
      uvIndex: closest.uvi ?? 0,
      provider: this.provider,
      fetchedAt: new Date(),
    };
  }

  /**
   * Normalize OpenWeatherMap's condition main to lowercase snake_case
   * e.g., "Clouds" -> "clouds", "Clear" -> "clear"
   */
  private normalizeConditionCode(main: string): string {
    return main.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Build OpenWeatherMap icon URL
   * https://openweathermap.org/weather-conditions
   */
  private buildIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  /**
   * Extract precipitation from rain/snow objects
   * Prefers 1h reading, falls back to 3h divided by 3
   */
  private extractPrecipitation(data: OpenWeatherMapCurrentResponse): number {
    const rain1h = data.rain?.['1h'] ?? 0;
    const rain3h = data.rain?.['3h'] ?? 0;
    const snow1h = data.snow?.['1h'] ?? 0;
    const snow3h = data.snow?.['3h'] ?? 0;

    // Prefer 1h readings
    if (rain1h > 0 || snow1h > 0) {
      return rain1h + snow1h;
    }

    // Fall back to 3h average
    if (rain3h > 0 || snow3h > 0) {
      return (rain3h + snow3h) / 3;
    }

    return 0;
  }
}