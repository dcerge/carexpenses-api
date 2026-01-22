import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.TRAVELS, (table) => {
    // Tax categorization
    table
      .string(FIELDS.TRAVEL_TYPE, 32)
      .notNullable()
      .defaultTo('business')
      .comment('Travel type for tax purposes: business, personal, medical, charity, commute');

    table
      .boolean(FIELDS.IS_ROUND_TRIP)
      .notNullable()
      .defaultTo(false)
      .comment('Whether this is a round trip (return uses same distance)');

    // Reimbursement tracking
    table
      .decimal(FIELDS.REIMBURSEMENT_RATE, 10, 4)
      .nullable()
      .comment('Reimbursement rate per distance unit (e.g., 0.67 per mile for IRS 2024)');

    table
      .string(FIELDS.REIMBURSEMENT_RATE_CURRENCY, 3)
      .nullable()
      .comment('Currency of reimbursement rate (ISO 4217)');

    table
      .decimal(FIELDS.CALCULATED_REIMBURSEMENT, 19, 4)
      .nullable()
      .comment('Calculated reimbursement amount (rate × distance)');

    // Time tracking (useful for gig economy profitability analysis)
    table
      .integer(FIELDS.ACTIVE_MINUTES)
      .nullable()
      .comment('Active driving/working time in minutes');

    table
      .integer(FIELDS.TOTAL_MINUTES)
      .nullable()
      .comment('Total time including waiting in minutes');

    // Indexes for common queries
    table.index([FIELDS.TRAVEL_TYPE]);
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.TRAVELS, (table) => {
    table.dropIndex([FIELDS.TRAVEL_TYPE]);
    table.dropColumn(FIELDS.TRAVEL_TYPE);
    table.dropColumn(FIELDS.IS_ROUND_TRIP);
    table.dropColumn(FIELDS.REIMBURSEMENT_RATE);
    table.dropColumn(FIELDS.REIMBURSEMENT_RATE_CURRENCY);
    table.dropColumn(FIELDS.CALCULATED_REIMBURSEMENT);
    table.dropColumn(FIELDS.ACTIVE_MINUTES);
    table.dropColumn(FIELDS.TOTAL_MINUTES);
  });