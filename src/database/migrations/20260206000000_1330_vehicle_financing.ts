// ./src/database/migrations/20260206000000_1330_vehicle_financing.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.VEHICLE_FINANCING, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Vehicle financing record ID');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table.uuid(FIELDS.USER_ID).notNullable().comment('User ID - user who created the financing record');

    table
      .uuid(FIELDS.CAR_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.CARS}`)
      .comment('Reference to the vehicle');

    table
      .uuid(FIELDS.EXPENSE_SCHEDULE_ID)
      .nullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.EXPENSE_SCHEDULES}`)
      .comment('Reference to the auto-created expense schedule for recurring payments');

    // ---------------------------------------------------------------------------
    // Financing Terms
    // ---------------------------------------------------------------------------

    table
      .string(FIELDS.FINANCING_TYPE, 16)
      .notNullable()
      .comment('Financing type: loan, lease');

    table
      .string(FIELDS.LENDER_NAME, 128)
      .nullable()
      .comment('Bank, credit union, or leasing company name');

    table
      .string(FIELDS.AGREEMENT_NUMBER, 64)
      .nullable()
      .comment('Loan or lease agreement/account number from the lender');

    table
      .datetime(FIELDS.START_DATE)
      .notNullable()
      .comment('Loan or lease start date (in UTC timezone)');

    table
      .datetime(FIELDS.END_DATE)
      .nullable()
      .comment('Loan maturity date or lease end date (in UTC timezone)');

    table
      .integer(FIELDS.TERM_MONTHS)
      .nullable()
      .comment('Total term length in months');

    table
      .decimal(FIELDS.TOTAL_AMOUNT, 19, 4)
      .defaultTo(0)
      .notNullable()
      .comment('Loan principal or total lease cost');

    table
      .string(FIELDS.FINANCING_CURRENCY, 3)
      .nullable()
      .comment('Currency of financing amounts (ISO 4217)');

    table
      .decimal(FIELDS.INTEREST_RATE, 7, 4)
      .nullable()
      .comment('Annual interest rate as percentage (e.g. 5.2500 for 5.25%). Primarily for loans.');

    table
      .decimal(FIELDS.DOWN_PAYMENT, 19, 4)
      .defaultTo(0)
      .notNullable()
      .comment('Initial down payment amount');

    // ---------------------------------------------------------------------------
    // Lease-Specific Fields
    // ---------------------------------------------------------------------------

    table
      .decimal(FIELDS.RESIDUAL_VALUE, 19, 4)
      .nullable()
      .comment('Lease residual / buyout price at end of term');

    table
      .decimal(FIELDS.MILEAGE_ALLOWANCE, 12, 2)
      .nullable()
      .comment('Annual mileage allowance for leases (in vehicle mileage_in unit: km or mi)');

    table
      .string(FIELDS.MILEAGE_ALLOWANCE_UNIT, 8)
      .nullable()
      .comment('Unit for mileage allowance: km, mi. Should match vehicle mileage_in setting.');

    table
      .decimal(FIELDS.MILEAGE_OVERAGE_COST, 10, 4)
      .nullable()
      .comment('Cost per km/mile over the annual mileage allowance');

    // ---------------------------------------------------------------------------
    // Additional Info
    // ---------------------------------------------------------------------------

    table
      .text(FIELDS.NOTES)
      .nullable()
      .comment('Additional terms, conditions, or notes about the financing agreement');

    // ---------------------------------------------------------------------------
    // Standard Audit Fields
    // ---------------------------------------------------------------------------
    // status: 100 = Active (current financing), 200 = Completed (paid off / lease ended), 10000 = Removed
    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // ---------------------------------------------------------------------------
    // Indexes
    // ---------------------------------------------------------------------------
    table.index([FIELDS.ACCOUNT_ID]);
    table.index([FIELDS.CAR_ID]);
    table.index([FIELDS.USER_ID]);
    table.index([FIELDS.EXPENSE_SCHEDULE_ID]);

    table.comment(
      'Vehicle financing records tracking loan and lease terms. Each vehicle can have multiple financing records over time but only one with status=100 (Active) at a time. Payment scheduling is delegated to expense_schedules via expense_schedule_id. Mileage allowance is stored as annual amount in the unit specified by mileage_allowance_unit.'
    );
  });

  // Partial index: efficiently find the active financing for a vehicle
  await knex.raw(`
    CREATE INDEX idx_vehicle_financing_active
    ON ${dbSchema}.${TABLES.VEHICLE_FINANCING} (${FIELDS.ACCOUNT_ID}, ${FIELDS.CAR_ID})
    WHERE (${FIELDS.REMOVED_AT} IS NULL AND ${FIELDS.STATUS} = 100)
  `);
};

export const down = async (knex: Knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${dbSchema}.idx_vehicle_financing_active`);
  await knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.VEHICLE_FINANCING);
};