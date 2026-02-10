// ./src/database/migrations/20260210000000_1400_alter_tire_set_items_add_warnings.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.TIRE_SET_ITEMS, (table) => {
    // -------------------------------------------------------------------------
    // Mileage Tracking
    // -------------------------------------------------------------------------

    table
      .decimal(FIELDS.ODOMETER_AT_INSTALL_KM, 19, 4)
      .nullable()
      .comment(
        'Odometer reading in kilometers when this item was last installed on the vehicle. ' +
        'Set during tire set creation (if active) or during swap-in. Cleared on swap-out ' +
        'after mileage is accumulated into mileage_accumulated_km. ' +
        'Always stored in km regardless of the car\'s mileage_in unit; conversion to the ' +
        'car\'s display unit (km/mi) happens in the API output layer. ' +
        'Null when the set is currently in storage or when odometer was not recorded.',
      );

    table
      .decimal(FIELDS.MILEAGE_ACCUMULATED_KM, 19, 4)
      .notNullable()
      .defaultTo(0)
      .comment(
        'Total kilometers driven on this item across all previous installation periods, ' +
        'plus any user-entered initial mileage for used tires. ' +
        'On swap-out: mileage_accumulated_km += (swap_odometer_km - odometer_at_install_km). ' +
        'On creation with condition "used" or "came_with_vehicle": user may enter an estimated ' +
        'initial value (e.g., 30,000 km for tires bought second-hand). ' +
        'Total lifetime mileage (computed, not stored): ' +
        'if set is active: mileage_accumulated_km + (car_current_odometer_km - odometer_at_install_km). ' +
        'If set is stored: mileage_accumulated_km. ' +
        'Always stored in km; converted to display unit in the API output layer.',
      );

    // -------------------------------------------------------------------------
    // Tread Depth Tracking
    // -------------------------------------------------------------------------

    table
      .decimal(FIELDS.TREAD_DEPTH_CURRENT, 5, 2)
      .nullable()
      .comment(
        'Latest measured tread depth in millimeters. Updated manually by the user whenever ' +
        'they measure their tires. Compared against the parent tire set\'s tread_limit_mm ' +
        '(or global default of 2.0 mm) to compute TREAD_WARNING and TREAD_CRITICAL flags. ' +
        'Null when the user has never recorded a measurement. ' +
        'Typical new tire tread: 8-9 mm (summer), 9-10 mm (winter). ' +
        'Legal minimums: 1.6 mm (North America, most of Europe), 3.0 mm (recommended for winter in Germany).',
      );

    table
      .timestamp(FIELDS.TREAD_DEPTH_MEASURED_AT, { useTz: true })
      .nullable()
      .comment(
        'When tread_depth_current was last measured/updated by the user. ' +
        'Used to compute the TREAD_STALE warning flag when the measurement is older ' +
        'than the global stale threshold (default: 12 months). ' +
        'Null when tread_depth_current has never been recorded.',
      );

    // -------------------------------------------------------------------------
    // Computed Warning Flags (updated by daily cron job)
    // -------------------------------------------------------------------------

    table
      .integer(FIELDS.WARNING_FLAGS)
      .notNullable()
      .defaultTo(0)
      .comment(
        'Bitmask of active warnings for this individual item, computed by the daily cron job. ' +
        'Bit values: 1=AGE_WARNING (>=70% of age limit from DOT code), ' +
        '2=AGE_CRITICAL (>=100% of age limit), ' +
        '4=MILEAGE_WARNING (>=70% of mileage warranty), ' +
        '8=MILEAGE_CRITICAL (>=100% of mileage warranty), ' +
        '16=TREAD_WARNING (tread depth <= 130% of tread limit), ' +
        '32=TREAD_CRITICAL (tread depth <= tread limit), ' +
        '256=TREAD_STALE (tread measurement older than 12 months). ' +
        'Set-level flags (64=SEASONAL_MISMATCH, 128=STORAGE_LONG) are NOT stored here — ' +
        'only on the parent tire_sets.warning_flags. ' +
        'The parent set\'s warning_flags is the bitwise OR of all its items\' flags ' +
        'plus the set-level flags.',
      );

    // -------------------------------------------------------------------------
    // Indexes
    // -------------------------------------------------------------------------

    table.index(
      [FIELDS.WARNING_FLAGS],
      'tire_set_items_warning_flags_index',
    );
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.TIRE_SET_ITEMS, (table) => {
    table.dropIndex([], 'tire_set_items_warning_flags_index');

    table.dropColumn(FIELDS.WARNING_FLAGS);
    table.dropColumn(FIELDS.TREAD_DEPTH_MEASURED_AT);
    table.dropColumn(FIELDS.TREAD_DEPTH_CURRENT);
    table.dropColumn(FIELDS.MILEAGE_ACCUMULATED_KM);
    table.dropColumn(FIELDS.ODOMETER_AT_INSTALL_KM);
  });
};