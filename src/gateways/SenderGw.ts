// ./src/gateways/SenderGw.ts
import { BaseGateway, HEADERS } from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES, queryGraphQL } from '@sdflc/api-helpers';

import config from '../config';
import { SendEmailArgs, SendPersonalization, MessageVariableInput } from '../boundary';
import { logger } from '../logger';

const { gatewayUrl, interserviceApiKey, spaceId: configSpaceId } = config;

class SenderGw extends BaseGateway {
  constructor(props: any) {
    super({
      ...props,
      loaderFn: () => {
        return [];
      },
    });
  }

  async sendEmail(args: SendEmailArgs) {
    const { params, jwtToken, spaceId } = args;

    if (!gatewayUrl) {
      return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, null, 'No gateway URL provoded to send an email');
    }

    const headers = {};

    if (jwtToken) {
      headers[HEADERS.AUTHORIZATION] = `Bearer ${jwtToken}`;
    }

    if (interserviceApiKey) {
      headers[HEADERS.API_KEY] = interserviceApiKey;
    }

    if (spaceId || configSpaceId) {
      headers[HEADERS.SPACE_ID] = spaceId || configSpaceId;
    }

    let personalizations: any = [];
    if (params?.personalizations) {
      if (Array.isArray(params?.personalizations)) {
        personalizations = params?.personalizations;
      } else if (typeof params?.personalizations === 'object') {
        personalizations = Object.keys(params?.personalizations).reduce((acc: SendPersonalization[], key: string) => {
          acc.push({
            name: `{{${key}}}`,
            value: [params?.personalizations?.[key]?.toString()],
          });

          return acc;
        }, []);
      }
    }

    let variables: any = [];
    if (params?.variables) {
      if (Array.isArray(params?.variables)) {
        variables = params.variables;
      } else if (typeof params?.variables === 'object') {
        variables = Object.keys(params?.variables).reduce((acc: MessageVariableInput[], key: string) => {
          acc.push({
            name: `{{${key}}}`,
            value: params?.variables?.[key]?.toString(),
          });

          return acc;
        }, []);
      }
    }
    //logger.debug('Sending email:', gatewayUrl, headers, JSON.stringify(args, null, 2));

    const paramsToUse = { ...params, personalizations, variables };

    const result = await queryGraphQL({
      url: gatewayUrl,
      queryName: 'messageSend',
      query: `
        mutation MessageSend ($params: MessageInput) {
          messageSend(params: $params) {
            code
            errors {
              name
              errors
              warnings
            }
            data {
              id
              status
            }
          }
        }
      `,
      variables: { params: paramsToUse },
      headers,
    });

    if (result.didFail()) {
      logger.error('Failed to send an email:', JSON.stringify(result, null, 2));
    } else {
      logger.log('Email sent successfully:', JSON.stringify(result, null, 2));
    }

    return result;
  }

  // async sendErrorEmail(args: any) {}

  // async sendSms(args: any) {}

  // async sendErrorSms(args: any) {}
}

export { SenderGw };
