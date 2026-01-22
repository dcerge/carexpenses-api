/**
 * Weather Gateway Types
 * Shared types and interfaces for weather data providers
 */

// ============================================================================
// REDIS CLIENT TYPE
// ============================================================================

/**
 * Redis client interface compatible with redis v5 and @sdflc/backend-helpers
 * Only defines the methods we actually use
 */
export interface RedisClientLike {
  get(key: string): Promise<string | null>;
  setEx(key: string, seconds: number, value: string): Promise<string | null>;
}

// ============================================================================
// WEATHER DATA TYPES
// ============================================================================

export interface WeatherData {
  // Temperature (stored in Celsius)
  tempC: number;
  feelsLikeC: number;

  // Conditions
  conditionCode: string;
  conditionIcon: string;
  description: string;

  // Atmospheric
  humidityPct: number;
  pressureHpa: number;
  cloudPct: number;
  visibilityM: number;

  // Wind (stored in m/s)
  windSpeedMps: number;
  windDirDeg: number;

  // Precipitation & UV
  precipMm: number;
  uvIndex: number;

  // Metadata
  provider: WeatherProvider;
  fetchedAt: Date;
}

export type WeatherProvider = 'google' | 'openweathermap';

export interface WeatherLocation {
  latitude: number;
  longitude: number;
}

export interface WeatherRequest {
  location: WeatherLocation;
  recordedAt?: Date;
  provider?: WeatherProvider;
}

// ============================================================================
// PROVIDER RESPONSE TYPES - GOOGLE WEATHER API
// ============================================================================

export interface GoogleWeatherResponse {
  currentTime: string;
  timeZone: {
    id: string;
  };
  isDaytime: boolean;
  weatherCondition: {
    iconBaseUri: string;
    description: {
      text: string;
      languageCode: string;
    };
    type: string;
  };
  temperature: {
    degrees: number;
    unit: string;
  };
  feelsLikeTemperature: {
    degrees: number;
    unit: string;
  };
  dewPoint?: {
    degrees: number;
    unit: string;
  };
  relativeHumidity: number;
  uvIndex: number;
  precipitation: {
    probability?: {
      percent: number;
      type: string;
    };
    qpf: {
      quantity: number;
      unit: string;
    };
    snowQpf?: {
      quantity: number;
      unit: string;
    };
  };
  thunderstormProbability?: number;
  airPressure: {
    meanSeaLevelMillibars: number;
  };
  wind: {
    direction: {
      degrees: number;
      cardinal: string;
    };
    speed: {
      value: number;
      unit: string;
    };
    gust?: {
      value: number;
      unit: string;
    };
  };
  cloudCover?: number;
  visibility?: {
    distance: number;
    unit: string;
  };
}

export interface GoogleWeatherHistoryResponse {
  historyHours: Array<{
    interval: {
      startTime: string;
      endTime: string;
    };
    weatherCondition: GoogleWeatherResponse['weatherCondition'];
    temperature: GoogleWeatherResponse['temperature'];
    feelsLikeTemperature: GoogleWeatherResponse['feelsLikeTemperature'];
    relativeHumidity: number;
    uvIndex: number;
    precipitation: GoogleWeatherResponse['precipitation'];
    airPressure: GoogleWeatherResponse['airPressure'];
    wind: GoogleWeatherResponse['wind'];
    cloudCover?: number;
    visibility?: GoogleWeatherResponse['visibility'];
  }>;
}

// ============================================================================
// PROVIDER RESPONSE TYPES - OPENWEATHERMAP
// ============================================================================

export interface OpenWeatherMapCurrentResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  snow?: {
    '1h'?: number;
    '3h'?: number;
  };
  dt: number;
  sys: {
    type?: number;
    id?: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

export interface OpenWeatherMapHistoricalResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  data: Array<{
    dt: number;
    sunrise?: number;
    sunset?: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    rain?: {
      '1h'?: number;
    };
    snow?: {
      '1h'?: number;
    };
  }>;
}

// ============================================================================
// GATEWAY INTERFACE
// ============================================================================

export interface IWeatherProviderGateway {
  readonly provider: WeatherProvider;

  /**
   * Fetch current weather conditions
   */
  fetchCurrent(location: WeatherLocation): Promise<WeatherData | null>;

  /**
   * Fetch historical weather for a specific time
   * Returns null if historical data is not supported or unavailable
   */
  fetchHistorical(
    location: WeatherLocation,
    recordedAt: Date
  ): Promise<WeatherData | null>;

  /**
   * Check if provider supports historical data for the given date
   */
  supportsHistorical(recordedAt: Date): boolean;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface GoogleWeatherConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface OpenWeatherMapConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface WeatherGatewayConfig {
  google?: GoogleWeatherConfig;
  openWeatherMap?: OpenWeatherMapConfig;
  defaultProvider: WeatherProvider;
  cacheTtlSeconds?: number;
}