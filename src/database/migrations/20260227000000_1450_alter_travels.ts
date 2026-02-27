import { Knex } from 'knex';

import config from '../../config';
import { TABLES } from '../helpers';

const { dbSchema } = config;

const INDEX_NAME = 'travels_purpose_lookup_idx';

export const up = async (knex: Knex) => {
  await knex.raw(`
    CREATE INDEX ${INDEX_NAME}
    ON ${dbSchema}.${TABLES.TRAVELS} (account_id, car_id, LOWER(TRIM(purpose)), first_dttm DESC)
    WHERE removed_at IS NULL AND purpose IS NOT NULL AND TRIM(purpose) != '';
  `);
};

export const down = async (knex: Knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${dbSchema}.${INDEX_NAME};`);
};