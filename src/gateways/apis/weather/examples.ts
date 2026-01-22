// /**
//  * Weather Gateway Usage Examples
//  *
//  * This file demonstrates how to integrate the WeatherGateway
//  * with your CarExpenses application.
//  */

// import {
//   createWeatherGateway,
//   mapWeatherToDbFields,
//   RedisClientLike,
//   WeatherGateway,
//   WeatherProvider,
// } from './index';

// // =============================================================================
// // EXAMPLE 1: Basic Gateway Setup
// // =============================================================================

// /**
//  * Create gateway with both providers
//  *
//  * In your application, use the weatherClient module:
//  *
//  * ```typescript
//  * import { weatherGateway } from './weatherClient';
//  *
//  * // weatherGateway is already configured with redisClient and config
//  * const weather = await weatherGateway?.fetchWeather({
//  *   location: { latitude: 51.5074, longitude: -0.1278 },
//  * });
//  * ```
//  */
// function setupWeatherGateway(redis: RedisClientLike | null): WeatherGateway {
//   return createWeatherGateway(
//     {
//       googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
//       openWeatherMapApiKey: process.env.OPENWEATHERMAP_API_KEY,
//       defaultProvider: 'google', // Use Google as primary
//       cacheTtlSeconds: 1800, // 30 minutes
//     },
//     redis
//   );
// }

// // =============================================================================
// // EXAMPLE 2: Fetching Weather for a New Record
// // =============================================================================

// /**
//  * Fetch weather when creating an expense/refuel/checkpoint
//  */
// async function fetchWeatherForNewRecord(
//   weatherGateway: WeatherGateway,
//   latitude: number,
//   longitude: number,
//   recordedAt?: Date
// ): Promise<ReturnType<typeof mapWeatherToDbFields>> {
//   const weather = await weatherGateway.fetchWeather({
//     location: { latitude, longitude },
//     recordedAt,
//     // Provider is auto-selected based on date:
//     // - Recent (< 24h): Google
//     // - Historical (> 24h): OpenWeatherMap
//   });

//   return mapWeatherToDbFields(weather);
// }

// // =============================================================================
// // EXAMPLE 3: Integration with RefuelCore
// // =============================================================================

// /**
//  * Example integration in RefuelCore.ts
//  *
//  * Add this to your RefuelCore class:
//  *
//  * ```typescript
//  * import { weatherGateway } from '../weatherClient';
//  * import { mapWeatherToDbFields } from '../gateways/weather';
//  *
//  * export class RefuelCore extends AppCore {
//  *   async createRefuel(input: CreateRefuelInput): Promise<Refuel> {
//  *     return this.runAction(async () => {
//  *       // ... validation and main creation logic ...
//  *
//  *       const refuel = await this.refuelGateway.create(validatedInput);
//  *
//  *       // Fetch weather asynchronously (non-blocking)
//  *       this.enrichWithWeather(refuel.id, refuel.expenseBaseId);
//  *
//  *       return refuel;
//  *     });
//  *   }
//  *
//  *   private async enrichWithWeather(
//  *     refuelId: string,
//  *     expenseBaseId: string
//  *   ): Promise<void> {
//  *     try {
//  *       const expenseBase = await this.expenseBaseGateway.findById(expenseBaseId);
//  *
//  *       if (!expenseBase?.latitude || !expenseBase?.longitude) {
//  *         return;
//  *       }
//  *
//  *       const weather = await weatherGateway.fetchWeather({
//  *         location: {
//  *           latitude: expenseBase.latitude,
//  *           longitude: expenseBase.longitude,
//  *         },
//  *         recordedAt: expenseBase.recordedAt,
//  *       });
//  *
//  *       if (weather) {
//  *         const weatherFields = mapWeatherToDbFields(weather);
//  *         await this.expenseBaseGateway.update(expenseBaseId, weatherFields);
//  *       }
//  *     } catch (error) {
//  *       // Log but don't fail the main operation
//  *       console.error('Failed to enrich refuel with weather:', error);
//  *     }
//  *   }
//  * }
//  * ```
//  */

// // =============================================================================
// // EXAMPLE 4: Force Specific Provider
// // =============================================================================

// /**
//  * Force using a specific provider regardless of date
//  */
// async function fetchFromSpecificProvider(
//   weatherGateway: WeatherGateway,
//   latitude: number,
//   longitude: number,
//   provider: WeatherProvider
// ): Promise<ReturnType<typeof mapWeatherToDbFields>> {
//   const weather = await weatherGateway.fetchWeather({
//     location: { latitude, longitude },
//     provider, // Force this provider
//   });

//   return mapWeatherToDbFields(weather);
// }

// // =============================================================================
// // EXAMPLE 5: Check Historical Support Before Fetching
// // =============================================================================

// /**
//  * Check if historical weather is available before attempting fetch
//  */
// async function fetchHistoricalIfSupported(
//   weatherGateway: WeatherGateway,
//   latitude: number,
//   longitude: number,
//   recordedAt: Date
// ): Promise<ReturnType<typeof mapWeatherToDbFields>> {
//   // Check which providers support this date
//   const googleSupports = weatherGateway.supportsHistorical(recordedAt, 'google');
//   const owmSupports = weatherGateway.supportsHistorical(recordedAt, 'openweathermap');

//   console.log(`Historical support for ${recordedAt.toISOString()}:`);
//   console.log(`  Google: ${googleSupports ? 'Yes' : 'No (> 24 hours)'}`);
//   console.log(`  OpenWeatherMap: ${owmSupports ? 'Yes' : 'No'}`);

//   if (!googleSupports && !owmSupports) {
//     console.warn('No provider supports historical data for this date');
//     return mapWeatherToDbFields(null);
//   }

//   const weather = await weatherGateway.fetchWeather({
//     location: { latitude, longitude },
//     recordedAt,
//   });

//   return mapWeatherToDbFields(weather);
// }

// // =============================================================================
// // EXAMPLE 6: Batch Weather Enrichment (for imports)
// // =============================================================================

// /**
//  * Enrich multiple records with weather data
//  * Useful for CSV imports or bulk operations
//  */
// async function enrichBatchWithWeather(
//   weatherGateway: WeatherGateway,
//   records: Array<{
//     id: string;
//     latitude: number | null;
//     longitude: number | null;
//     recordedAt: Date;
//   }>,
//   updateFn: (id: string, weatherFields: ReturnType<typeof mapWeatherToDbFields>) => Promise<void>
// ): Promise<{ success: number; skipped: number; failed: number }> {
//   const stats = { success: 0, skipped: 0, failed: 0 };

//   for (const record of records) {
//     // Skip records without coordinates
//     if (!record.latitude || !record.longitude) {
//       stats.skipped++;
//       continue;
//     }

//     try {
//       const weather = await weatherGateway.fetchWeather({
//         location: {
//           latitude: record.latitude,
//           longitude: record.longitude,
//         },
//         recordedAt: record.recordedAt,
//       });

//       if (weather) {
//         const weatherFields = mapWeatherToDbFields(weather);
//         await updateFn(record.id, weatherFields);
//         stats.success++;
//       } else {
//         stats.skipped++;
//       }
//     } catch (error) {
//       console.error(`Failed to fetch weather for record ${record.id}:`, error);
//       stats.failed++;
//     }

//     // Rate limiting: small delay between requests
//     await new Promise((resolve) => setTimeout(resolve, 100));
//   }

//   return stats;
// }

// // =============================================================================
// // EXAMPLE 7: Environment Configuration
// // =============================================================================

// /**
//  * Since your config uses buildConfig which auto-camelCases env vars,
//  * just add these to your .env file:
//  *
//  * ```
//  * # Weather APIs
//  * GOOGLE_MAPS_API_KEY=your_google_maps_api_key
//  * OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
//  * WEATHER_DEFAULT_PROVIDER=google
//  * WEATHER_CACHE_TTL=1800
//  * ```
//  *
//  * These become available as:
//  * - config.googleMapsApiKey
//  * - config.openweathermapApiKey
//  * - config.weatherDefaultProvider
//  * - config.weatherCacheTtl
//  *
//  * Then create the gateway module (see weatherClient.ts):
//  *
//  * ```typescript
//  * // ./src/weatherClient.ts
//  * import { createWeatherGateway } from './gateways/weather';
//  * import { redisClient } from './redisClient';
//  * import config from './config';
//  *
//  * const googleApiKey = config.googleMapsApiKey || config.googleWeatherApiKey;
//  * const openWeatherMapApiKey = config.openweathermapApiKey;
//  *
//  * export const weatherGateway = googleApiKey || openWeatherMapApiKey
//  *   ? createWeatherGateway({
//  *       googleApiKey,
//  *       openWeatherMapApiKey,
//  *       defaultProvider: config.weatherDefaultProvider || 'google',
//  *       cacheTtlSeconds: parseInt(config.weatherCacheTtl, 10) || 1800,
//  *     }, redisClient)
//  *   : null;
//  * ```
//  */

// export {
//   enrichBatchWithWeather,
//   fetchHistoricalIfSupported,
//   fetchWeatherForNewRecord,
//   fetchFromSpecificProvider,
//   setupWeatherGateway,
// };