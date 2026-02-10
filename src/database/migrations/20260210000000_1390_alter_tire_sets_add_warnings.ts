// ./src/database/migrations/20260210000000_1390_alter_tire_sets_add_warnings.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.TIRE_SETS, (table) => {
    // -------------------------------------------------------------------------
    // Installation & Storage Timestamps
    // -------------------------------------------------------------------------

    table
      .timestamp(FIELDS.INSTALLED_AT, { useTz: true })
      .nullable()
      .comment(
        'When the tire set was last installed (activated) on the vehicle. ' +
        'Updated on each swap-in. Used to determine seasonal mismatch warnings ' +
        'and as a reference point for the current installation period.',
      );

    table
      .timestamp(FIELDS.STORED_AT, { useTz: true })
      .nullable()
      .comment(
        'When the tire set was last removed from the vehicle and placed in storage. ' +
        'Updated on each swap-out. Cleared when the set is installed again. ' +
        'Used to calculate storage duration for the STORAGE_LONG warning.',
      );

    // -------------------------------------------------------------------------
    // Warning Thresholds (nullable = use global defaults)
    // -------------------------------------------------------------------------
    // Each threshold defines the "critical" point (100% = time to replace).
    // The "warning" level is automatically derived as 70% of the threshold.
    // For tread depth the logic is inverted: critical when depth <= threshold,
    // warning when depth <= threshold * 1.3.
    // -------------------------------------------------------------------------

    table
      .integer(FIELDS.MILEAGE_WARRANTY_KM)
      .nullable()
      .comment(
        'Mileage warranty in kilometers. When total mileage across all installation ' +
        'periods reaches this value, the MILEAGE_CRITICAL flag is set. At 70% of this ' +
        'value the MILEAGE_WARNING flag is set. Null means use the global default ' +
        '(80,000 km). Applied to all items in the set unless overridden at item level.',
      );

    table
      .specificType(FIELDS.AGE_LIMIT_YEARS, 'smallint')
      .nullable()
      .comment(
        'Maximum tire age in years, derived from the DOT manufacturing code on each item. ' +
        'When any item in the set reaches this age, AGE_CRITICAL is set. At 70% of this ' +
        'value AGE_WARNING is set. Null means use the global default (10 years). ' +
        'Industry recommendation: inspect at 5-6 years, replace by 10 regardless of tread.',
      );

    table
      .decimal(FIELDS.TREAD_LIMIT_MM, 5, 2)
      .nullable()
      .comment(
        'Minimum acceptable tread depth in millimeters. When any item\'s tread_depth_current ' +
        'falls to this value, TREAD_CRITICAL is set. At 130% of this value TREAD_WARNING is set. ' +
        'Null means use the global default (2.0 mm). Legal minimums vary: 1.6 mm in North America ' +
        'and most of Europe, 3.0 mm recommended for winter tires in Germany.',
      );

    // -------------------------------------------------------------------------
    // Computed Warning Flags (updated by daily cron job)
    // -------------------------------------------------------------------------

    table
      .integer(FIELDS.WARNING_FLAGS)
      .notNullable()
      .defaultTo(0)
      .comment(
        'Bitmask of active warnings, computed by the daily cron job. ' +
        'Represents the bitwise OR of all item-level warning_flags in this set ' +
        'plus set-level flags (SEASONAL_MISMATCH, STORAGE_LONG). ' +
        'Bit values: 1=AGE_WARNING, 2=AGE_CRITICAL, 4=MILEAGE_WARNING, 8=MILEAGE_CRITICAL, ' +
        '16=TREAD_WARNING, 32=TREAD_CRITICAL, 64=SEASONAL_MISMATCH, 128=STORAGE_LONG, ' +
        '256=TREAD_STALE. ' +
        'Dashboard query: WHERE warning_flags > 0 AND account_id = $1. ' +
        'Specific flag check: WHERE (warning_flags & 4) > 0 for MILEAGE_WARNING.',
      );

    // -------------------------------------------------------------------------
    // Indexes
    // -------------------------------------------------------------------------

    table.index(
      [FIELDS.WARNING_FLAGS],
      'tire_sets_warning_flags_index',
    );
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.TIRE_SETS, (table) => {
    table.dropIndex([], 'tire_sets_warning_flags_index');

    table.dropColumn(FIELDS.WARNING_FLAGS);
    table.dropColumn(FIELDS.TREAD_LIMIT_MM);
    table.dropColumn(FIELDS.AGE_LIMIT_YEARS);
    table.dropColumn(FIELDS.MILEAGE_WARRANTY_KM);
    table.dropColumn(FIELDS.STORED_AT);
    table.dropColumn(FIELDS.INSTALLED_AT);
  });
};