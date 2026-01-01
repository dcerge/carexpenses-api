import { omit } from 'lodash';
import { queryGraphQL } from '@sdflc/api-helpers';
import { HEADERS } from '@sdflc/backend-helpers';

import { logger } from '../../logger';
import config from '../../config';

class AuthUserAccountGw {
  // public async list(args: any) {
  //   const { headers, filter, params } = args || {};
  //   const result = await queryGraphQL({
  //     url: config.gatewayUrl,
  //     queryName: 'accountList',
  //     query: `
  //       query AccountList($filter: AccountFilter, $params: PaginationAndSorting) {
  //         accountList(filter: $filter, params: $params) {
  //           code
  //           errors {
  //             name
  //             errors
  //           }
  //           data {
  //             id
  //             name
  //             paymentSystem
  //             psCustomerId
  //             psSubscriptionId
  //             psSubscriptionStatus
  //             currentPlan
  //             trialEndsAt
  //             currency
  //             countryId
  //             status
  //           }
  //         }
  //       }
  //     `,
  //     variables: {
  //       filter,
  //       params,
  //     },
  //     headers: {
  //       [HEADERS.SPACE_ID]: config.spaceId,
  //       ...omit(headers, Object.keys(config.skipHeaders)),
  //     },
  //   });
  //   if (result.code < 0) {
  //     logger.log(`Failed to list accounts. Result code ${result.code}:`, result.errors);
  //   }
  //   return Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null;
  // }
  // public async get(id: any) {
  //   const result = await queryGraphQL({
  //     url: config.gatewayUrl,
  //     queryName: 'accountGet',
  //     query: `
  //       query AccountGet($id: ID) {
  //         accountGet(id: $id) {
  //           code
  //           errors {
  //             name
  //             errors
  //           }
  //           data {
  //             id
  //             name
  //             paymentSystem
  //             psCustomerId
  //             psSubscriptionId
  //             psSubscriptionStatus
  //             currentPlan
  //             trialEndsAt
  //             currency
  //             countryId
  //             status
  //           }
  //         }
  //       }
  //     `,
  //     variables: {
  //       id,
  //     },
  //     headers: {
  //       [HEADERS.SPACE_ID]: config.spaceId,
  //       //...omit(headers, Object.keys(config.skipHeaders)),
  //     },
  //   });
  //   if (result.code < 0) {
  //     logger.log(`Failed to get an account by its ID '${id}'. Result code ${result.code}:`, result.errors);
  //   }
  //   return Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null;
  // }
  // public async getMany(ids: any) {
  //   const result = await queryGraphQL({
  //     url: config.gatewayUrl,
  //     queryName: 'accountGetMany',
  //     query: `
  //       query AccountGetMany($ids: [ID]) {
  //         accountGetMany(ids: $ids) {
  //           code
  //           errors {
  //             name
  //             errors
  //           }
  //           data {
  //             id
  //             name
  //             paymentSystem
  //             psCustomerId
  //             psSubscriptionId
  //             psSubscriptionStatus
  //             currentPlan
  //             trialEndsAt
  //             currency
  //             countryId
  //             status
  //           }
  //         }
  //       }
  //     `,
  //     variables: {
  //       ids,
  //     },
  //     headers: {
  //       [HEADERS.SPACE_ID]: config.spaceId,
  //       //...omit(headers, Object.keys(config.skipHeaders)),
  //     },
  //   });
  //   if (result.code < 0) {
  //     logger.log(
  //       `Failed to get an account by its ID '${ids}'. Result code ${result.code}:`,
  //       JSON.stringify(result.errors, null, 2),
  //     );
  //   }
  //   return Array.isArray(result.data) ? result.data : [];
  // }
  // public async update(accountId: string, params: any) {
  //   const result = await queryGraphQL({
  //     url: config.gatewayUrl,
  //     queryName: 'accountUpdate',
  //     query: `
  //       query AccountUpdate($where: AccountWhereInput, $params: AccountInput) {
  //         accountUpdate(where: $where, params: $params) {
  //           code
  //           errors {
  //             name
  //             errors
  //           }
  //           data {
  //             id
  //             name
  //             paymentSystem
  //             psCustomerId
  //             psSubscriptionId
  //             psSubscriptionStatus
  //             currentPlan
  //             trialEndsAt
  //             currency
  //             countryId
  //             status
  //           }
  //         }
  //       }
  //     `,
  //     variables: {
  //       where: {
  //         id: accountId,
  //       },
  //       params,
  //     },
  //     headers: {
  //       [HEADERS.SPACE_ID]: config.spaceId,
  //       //...omit(headers, Object.keys(config.skipHeaders)),
  //     },
  //   });
  //   if (result.code < 0) {
  //     logger.log(
  //       `Failed to update an account by its ID '${accountId}'. Result code ${result.code}:`,
  //       JSON.stringify(result.errors, null, 2),
  //     );
  //   }
  //   return Array.isArray(result.data) ? result.data : [];
  // }
}

export { AuthUserAccountGw };
