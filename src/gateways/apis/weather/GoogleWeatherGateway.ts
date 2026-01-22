/**
 * Google Weather API Gateway
 * https://developers.google.com/maps/documentation/weather
 *
 * Supports:
 * - Current conditions (real-time)
 * - Hourly forecast (up to 240 hours)
 * - Daily forecast (up to 10 days)
 * - Historical data (only 24 hours)
 */

import {
  GoogleWeatherConfig,
  GoogleWeatherHistoryResponse,
  GoogleWeatherResponse,
  IWeatherProviderGateway,
  WeatherData,
  WeatherLocation,
  WeatherProvider,
} from './weatherTypes';

const DEFAULT_BASE_URL = 'https://weather.googleapis.com/v1';
const HISTORICAL_LIMIT_HOURS = 24;

export class GoogleWeatherGateway implements IWeatherProviderGateway {
  public readonly provider: WeatherProvider = 'google';

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: GoogleWeatherConfig) {
    if (!config.apiKey) {
      throw new Error('Google Weather API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  /**
   * Fetch current weather conditions from Google Weather API
   */
  async fetchCurrent(location: WeatherLocation): Promise<WeatherData | null> {
    try {
      const url = this.buildUrl('/currentConditions:lookup', {
        'location.latitude': location.latitude.toString(),
        'location.longitude': location.longitude.toString(),
      });

      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `Google Weather API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data: GoogleWeatherResponse = await response.json();
      return this.mapCurrentResponse(data);
    } catch (error) {
      console.error('Google Weather API fetch failed:', error);
      return null;
    }
  }

  /**
   * Fetch historical weather from Google Weather API
   * Note: Google only supports 24 hours of history
   */
  async fetchHistorical(
    location: WeatherLocation,
    recordedAt: Date
  ): Promise<WeatherData | null> {
    if (!this.supportsHistorical(recordedAt)) {
      console.warn(
        `Google Weather API only supports ${HISTORICAL_LIMIT_HOURS} hours of history`
      );
      return null;
    }

    try {
      const url = this.buildUrl('/history/hours:lookup', {
        'location.latitude': location.latitude.toString(),
        'location.longitude': location.longitude.toString(),
        hours: HISTORICAL_LIMIT_HOURS.toString(),
      });

      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `Google Weather API history error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data: GoogleWeatherHistoryResponse = await response.json();
      return this.findClosestHistoricalHour(data, recordedAt);
    } catch (error) {
      console.error('Google Weather API history fetch failed:', error);
      return null;
    }
  }

  /**
   * Check if the given date is within the 24-hour historical limit
   */
  supportsHistorical(recordedAt: Date): boolean {
    const hoursAgo = (Date.now() - recordedAt.getTime()) / (1000 * 60 * 60);
    return hoursAgo <= HISTORICAL_LIMIT_HOURS;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private buildUrl(
    endpoint: string,
    params: Record<string, string>
  ): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('key', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }

  private mapCurrentResponse(data: GoogleWeatherResponse): WeatherData {
    return {
      tempC: data.temperature.degrees,
      feelsLikeC: data.feelsLikeTemperature.degrees,
      conditionCode: this.normalizeConditionCode(data.weatherCondition.type),
      conditionIcon: data.weatherCondition.iconBaseUri,
      description: data.weatherCondition.description.text,
      humidityPct: data.relativeHumidity,
      pressureHpa: Math.round(data.airPressure.meanSeaLevelMillibars),
      cloudPct: data.cloudCover ?? 0,
      visibilityM: data.visibility?.distance ?? 10000,
      windSpeedMps: this.kmhToMps(data.wind.speed.value),
      windDirDeg: data.wind.direction.degrees,
      precipMm: data.precipitation.qpf.quantity,
      uvIndex: data.uvIndex,
      provider: this.provider,
      fetchedAt: new Date(),
    };
  }

  private findClosestHistoricalHour(
    data: GoogleWeatherHistoryResponse,
    targetTime: Date
  ): WeatherData | null {
    if (!data.historyHours || data.historyHours.length === 0) {
      return null;
    }

    const targetTimestamp = targetTime.getTime();

    // Find the hour closest to the target time
    let closestHour = data.historyHours[0];
    let closestDiff = Infinity;

    for (const hour of data.historyHours) {
      const hourStart = new Date(hour.interval.startTime).getTime();
      const hourEnd = new Date(hour.interval.endTime).getTime();
      const hourMid = (hourStart + hourEnd) / 2;
      const diff = Math.abs(hourMid - targetTimestamp);

      if (diff < closestDiff) {
        closestDiff = diff;
        closestHour = hour;
      }
    }

    return {
      tempC: closestHour.temperature.degrees,
      feelsLikeC: closestHour.feelsLikeTemperature.degrees,
      conditionCode: this.normalizeConditionCode(
        closestHour.weatherCondition.type
      ),
      conditionIcon: closestHour.weatherCondition.iconBaseUri,
      description: closestHour.weatherCondition.description.text,
      humidityPct: closestHour.relativeHumidity,
      pressureHpa: Math.round(closestHour.airPressure.meanSeaLevelMillibars),
      cloudPct: closestHour.cloudCover ?? 0,
      visibilityM: closestHour.visibility?.distance ?? 10000,
      windSpeedMps: this.kmhToMps(closestHour.wind.speed.value),
      windDirDeg: closestHour.wind.direction.degrees,
      precipMm: closestHour.precipitation.qpf.quantity,
      uvIndex: closestHour.uvIndex,
      provider: this.provider,
      fetchedAt: new Date(),
    };
  }

  /**
   * Normalize Google's condition type to lowercase snake_case
   * e.g., "MOSTLY_CLOUDY" -> "mostly_cloudy"
   */
  private normalizeConditionCode(type: string): string {
    return type.toLowerCase();
  }

  /**
   * Convert km/h to m/s
   * Google returns wind speed in km/h, we store in m/s
   */
  private kmhToMps(kmh: number): number {
    return Math.round((kmh / 3.6) * 100) / 100;
  }
}