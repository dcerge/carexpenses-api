import { omit } from 'lodash';
import { queryGraphQL } from '@sdflc/api-helpers';
import { HEADERS } from '@sdflc/backend-helpers';

import { Database, DataCache } from '@sdflc/backend-helpers';
import { redisClient } from '../../redisClient';
import knexConfig from '../../knexConfig';

import { logger } from '../../logger';
import config from '../../config';

class AuthUserGw {
  private loader: DataCache;

  constructor() {
    this.loader = new DataCache({
      redisClient,
      keyPrefix: 'auth',
      loaderFn: this.loaderFn,
      db: new Database({
        dbType: config.dbType,
        knexConfig: knexConfig,
        dbSchema: config.dbSchema,
        logger: logger,
      }),
    });
  }

  private async loaderFn(ids: string[], context?: any) {
    //
  }

  public async list(args: any) {
    const { headers, filter, params } = args || {};

    return await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'userList',
      query: `
        query UserList($filter: UserFilter, $params: PaginationAndSortig) {
          userList(filter: $filter, params: $params) {
            code
            errors {
              name
              errors
            }
            data {
              id
              username
              email
              firstName
              middleName
              lastName
              avatarUrl
              birthday
              emailConfirmation
              status
              timeZone
              uiLanguage
              userAccounts {
                accountId
                userRoleId
              }
            }
          }
        }
      `,
      variables: {
        filter,
        params,
      },
      headers: {
        ...omit(headers, Object.keys(config.skipHeaders)),
      },
    });
  }

  public async get(id: any) {
    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'userGet',
      query: `
        query UserGet($id: ID) {
          userGet(id: $id) {
            code
            data {
              id
              username
              email
              firstName
              lastName
              avatarUrl
              birthday
              emailConfirmation
              status
              timeZone
              uiLanguage
              account {
                id
                trialEndsAt
                currentPlan
                appPlanPriceId
                appPlan {
                  planName
                  planFeaturesDetails {
                    featureCode
                    featureName
                    featureValueType
                    featureValue
                    status
                  }
                }
              }
              userRole {
                id
                roleName
              }
            }
            errors {
              name
              errors
            }
          }
        }
      `,
      variables: {
        id,
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
        [HEADERS.API_KEY]: config.interserviceApiKey,
        //...omit(headers, Object.keys(config.skipHeaders)),
      },
    });

    if (result.code < 0) {
      logger.log(`Failed to get a user by their ID '${id}'. Result code ${result.code}:`, result.errors);
    }

    return Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null;
  }

  public async getMany(ids: any) {
    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'userGetMany',
      query: `
        query UserGetMany($ids: [ID]) {
          userGetMany(ids: $ids) {
            code
            data {
              id
              username
              email
              firstName
              lastName
              avatarUrl
              birthday
              emailConfirmation
              status
              timeZone
              uiLanguage
              account {
                id
                trialEndsAt
                currentPlan
                appPlanPriceId
                appPlan {
                  planName
                  planFeaturesDetails {
                    featureCode
                    featureName
                    featureValueType
                    featureValue
                    status
                  }
                }
              }
              userRole {
                id
                roleName
              }
            }
            errors {
              name
              errors
            }
          }
        }
      `,
      variables: {
        ids,
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
        [HEADERS.API_KEY]: config.interserviceApiKey,
        //...omit(headers, Object.keys(config.skipHeaders)),
      },
    });

    if (result.code < 0) {
      logger.log(
        `Failed to get a user by their ID '${ids}'. Result code ${result.code}:`,
        JSON.stringify(result.errors, null, 2),
      );
    }

    return Array.isArray(result.data) ? result.data : [];
  }
}

export { AuthUserGw };
