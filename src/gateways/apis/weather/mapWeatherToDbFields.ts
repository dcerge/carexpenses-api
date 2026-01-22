/**
 * Weather Data Mapper
 *
 * Maps WeatherData to database fields for expense_bases table
 */

import { WeatherData } from './weatherTypes';

/**
 * Database field names for weather data
 * Must match the FIELDS constants in your project
 */
export const WEATHER_DB_FIELDS = {
  WEATHER_TEMP_C: 'weather_temp_c',
  WEATHER_FEELS_LIKE_C: 'weather_feels_like_c',
  WEATHER_CONDITION_CODE: 'weather_condition_code',
  WEATHER_CONDITION_ICON: 'weather_condition_icon',
  WEATHER_DESCRIPTION: 'weather_description',
  WEATHER_HUMIDITY_PCT: 'weather_humidity_pct',
  WEATHER_PRESSURE_HPA: 'weather_pressure_hpa',
  WEATHER_CLOUD_PCT: 'weather_cloud_pct',
  WEATHER_VISIBILITY_M: 'weather_visibility_m',
  WEATHER_WIND_SPEED_MPS: 'weather_wind_speed_mps',
  WEATHER_WIND_DIR_DEG: 'weather_wind_dir_deg',
  WEATHER_PRECIP_MM: 'weather_precip_mm',
  WEATHER_UV_INDEX: 'weather_uv_index',
  WEATHER_PROVIDER: 'weather_provider',
  WEATHER_FETCHED_AT: 'weather_fetched_at',
} as const;

/**
 * Database record type for weather fields
 */
export interface WeatherDbRecord {
  weather_temp_c: number | null;
  weather_feels_like_c: number | null;
  weather_condition_code: string | null;
  weather_condition_icon: string | null;
  weather_description: string | null;
  weather_humidity_pct: number | null;
  weather_pressure_hpa: number | null;
  weather_cloud_pct: number | null;
  weather_visibility_m: number | null;
  weather_wind_speed_mps: number | null;
  weather_wind_dir_deg: number | null;
  weather_precip_mm: number | null;
  weather_uv_index: number | null;
  weather_provider: string | null;
  weather_fetched_at: Date | null;
}

/**
 * Map WeatherData to database fields
 *
 * @param weather - WeatherData from gateway or null
 * @returns Object with database field names and values
 *
 * @example
 * ```typescript
 * const weather = await weatherGateway.fetchWeather({ location, recordedAt });
 * const dbFields = mapWeatherToDbFields(weather);
 * await knex('expense_bases').where({ id }).update(dbFields);
 * ```
 */
export function mapWeatherToDbFields(
  weather: WeatherData | null
): WeatherDbRecord {
  if (!weather) {
    return {
      weather_temp_c: null,
      weather_feels_like_c: null,
      weather_condition_code: null,
      weather_condition_icon: null,
      weather_description: null,
      weather_humidity_pct: null,
      weather_pressure_hpa: null,
      weather_cloud_pct: null,
      weather_visibility_m: null,
      weather_wind_speed_mps: null,
      weather_wind_dir_deg: null,
      weather_precip_mm: null,
      weather_uv_index: null,
      weather_provider: null,
      weather_fetched_at: null,
    };
  }

  return {
    weather_temp_c: weather.tempC,
    weather_feels_like_c: weather.feelsLikeC,
    weather_condition_code: truncate(weather.conditionCode, 32),
    weather_condition_icon: truncate(weather.conditionIcon, 16),
    weather_description: truncate(weather.description, 64),
    weather_humidity_pct: weather.humidityPct,
    weather_pressure_hpa: weather.pressureHpa,
    weather_cloud_pct: weather.cloudPct,
    weather_visibility_m: weather.visibilityM,
    weather_wind_speed_mps: weather.windSpeedMps,
    weather_wind_dir_deg: weather.windDirDeg,
    weather_precip_mm: weather.precipMm,
    weather_uv_index: weather.uvIndex,
    weather_provider: weather.provider,
    weather_fetched_at: weather.fetchedAt,
  };
}

/**
 * Map database record to WeatherData
 *
 * @param record - Database record with weather fields
 * @returns WeatherData or null if no weather data present
 */
export function mapDbFieldsToWeather(
  record: Partial<WeatherDbRecord>
): WeatherData | null {
  // Check if weather data exists
  if (record.weather_temp_c == null || record.weather_provider == null) {
    return null;
  }

  return {
    tempC: record.weather_temp_c,
    feelsLikeC: record.weather_feels_like_c ?? record.weather_temp_c,
    conditionCode: record.weather_condition_code ?? 'unknown',
    conditionIcon: record.weather_condition_icon ?? '',
    description: record.weather_description ?? '',
    humidityPct: record.weather_humidity_pct ?? 0,
    pressureHpa: record.weather_pressure_hpa ?? 0,
    cloudPct: record.weather_cloud_pct ?? 0,
    visibilityM: record.weather_visibility_m ?? 10000,
    windSpeedMps: record.weather_wind_speed_mps ?? 0,
    windDirDeg: record.weather_wind_dir_deg ?? 0,
    precipMm: record.weather_precip_mm ?? 0,
    uvIndex: record.weather_uv_index ?? 0,
    provider: record.weather_provider as WeatherData['provider'],
    fetchedAt: record.weather_fetched_at ?? new Date(),
  };
}

/**
 * Check if a record has weather data
 */
export function hasWeatherData(record: Partial<WeatherDbRecord>): boolean {
  return record.weather_temp_c != null && record.weather_provider != null;
}

/**
 * Truncate string to max length (for database field limits)
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength);
}