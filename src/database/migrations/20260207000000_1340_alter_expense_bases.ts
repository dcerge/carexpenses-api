import { Knex } from 'knex';

import config from '../../config';
import { TABLES } from '../helpers';

const { dbSchema } = config;

const INDEX_NAME = 'expense_bases_car_id_odometer_active';

export const up = async (knex: Knex) => {
  // Partial composite index for efficient lease mileage tracking aggregate queries.
  // Supports MIN/MAX(odometer, when_done) grouped by car_id for active records with odometer data.
  // Partial filter keeps the index compact — only rows with actual odometer readings are included.
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${INDEX_NAME}
      ON ${dbSchema}.${TABLES.EXPENSE_BASES} (car_id, when_done, odometer)
      WHERE odometer IS NOT NULL
        AND status = 100
        AND removed_at IS NULL
  `);
};

export const down = async (knex: Knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${dbSchema}.${INDEX_NAME}`);
};