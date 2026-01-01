import { omit } from 'lodash';

import { queryGraphQL } from '@sdflc/api-helpers';

import { Database, DataCache } from '@sdflc/backend-helpers';
import { redisClient } from '../../redisClient';
import knexConfig from '../../knexConfig';

import config from '../../config';
import { logger } from '../../logger';
import { HEADERS } from '@sdflc/backend-helpers';

class AuthGw {
  private loader: DataCache;

  constructor() {
    this.loader = new DataCache({
      redisClient,
      keyPrefix: 'auth1',
      buildKey: (key: any) => {
        const { userId, accountId } = key;
        console.log('==== buildKey', key);
        return `${userId}|${accountId}`;
      },
      loaderFn: this.loaderFn.bind(this),
      db: new Database({
        dbType: config.dbType,
        knexConfig: knexConfig,
        dbSchema: config.dbSchema,
        logger: logger,
      }),
    });
  }

  private async loaderFn(ids: string[]) {
    if (!Array.isArray(ids)) {
      return [];
    }

    console.log('Loading user detaila from the auth service for these users:', ids);

    const users: any[] = [];

    for (let id of ids) {
      const [userId, accountId] = id.split('|');

      const user = await this._meBy({ userId, accountId });

      users.push(user);
    }

    console.log('Found user detaila from the auth service for these users:', users);

    return users;
  }

  /**
   * Passes on sign up request to auth microservice
   * @param args Lookup GraphQL type `SignUpInput` of the `auth` microservice
   * @returns
   */
  public async signUp(args: any) {
    const { params, headers } = args || {};

    return await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'signUp',
      query: `
        mutation SignUp($params: SignUpInput) {
          signUp(params: $params) {
            code
            errors {
              name
              errors
              warnings
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
              token
              uiLanguage
              userAccounts {
                accountId
              }
            }
          }
        }      
      `,
      variables: {
        params,
      },
      headers: {
        ...omit(headers, Object.keys(config.skipHeaders)),
      },
    });
  }

  public async me(args: any) {
    const { headers } = args || {};

    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'me',
      query: `
        query Me {
          me {
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
              warnings
            }
          }
        }    
      `,
      variables: {},
      headers: {
        ...omit(headers, Object.keys(config.skipHeaders)),
      },
    });

    if (result.code < 0) {
      logger.log(`Failed to get current user details. Result code ${result.code}:`, result.errors);
    }

    return Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null;
  }

  private async _meBy(args: any) {
    const { userId, accountId } = args || {};

    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'meBy',
      query: `
        query MeBy($userId: ID, $accountId: ID) {
          meBy(userId: $userId, accountId: $accountId) {
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
              warnings
            }
          }
        }    
      `,
      variables: {
        userId,
        accountId,
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
        [HEADERS.API_KEY]: config.interserviceApiKey,
      },
    });

    if (result.code < 0) {
      logger.log(`Failed to get user details by userId and accountId. Result code ${result.code}:`, result.errors);
    }

    return Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null;
  }

  public async meBy(args: any): Promise<any> {
    return this._meBy(args);
    //console.log('==== meBy', args);
    //return this.loader.load(args);
  }
}

export { AuthGw };
