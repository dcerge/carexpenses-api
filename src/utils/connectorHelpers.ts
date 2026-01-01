// ./src/utils/connectorHelpers.ts
import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';
import {
  HttpConnectorConfig,
  AzureQueueConnectorConfig,
  AzureBlobConnectorConfig,
  AzureTableConnectorConfig,
  ConnectorSendParams,
  CONNECTOR_TYPES,
  AzureServiceBusConnectorConfig,
  AzureEventGridConnectorConfig,
  AwsS3ConnectorConfig,
  AwsSqsConnectorConfig,
  AwsSnsConnectorConfig,
  AwsEventBridgeConnectorConfig,
  AwsDynamoDbConnectorConfig,
  GcpStorageConnectorConfig,
  GcpPubSubConnectorConfig,
  GcpFirestoreConnectorConfig,
  SlackConnectorConfig,
  TelegramConnectorConfig,
  DiscordConnectorConfig,
  HubSpotConnectorConfig,
  GoogleSheetsConnectorConfig,
  NotionConnectorConfig,
  AirtableConnectorConfig,
  TrelloConnectorConfig,
  GitHubConnectorConfig,
  MailchimpConnectorConfig,
  ConvertKitConnectorConfig,
  FtpConnectorConfig,
} from '../boundary';
import {
  ConnectorWebhookHttpGw,
  ConnectorAzureQueueGw,
  ConnectorAzureBlobGw,
  ConnectorAzureTableGw,
  ConnectorAzureServiceBusGw,
  ConnectorAzureEventGridGw,
  ConnectorAwsS3Gw,
  ConnectorAwsSqsGw,
  ConnectorAwsSnsGw,
  ConnectorAwsEventBridgeGw,
  ConnectorAwsDynamoDbGw,
  ConnectorGcpStorageGw,
  ConnectorGcpPubSubGw,
  ConnectorGcpFirestoreGw,
  ConnectorSlackGw,
  ConnectorTelegramGw,
  ConnectorDiscordGw,
  ConnectorHubSpotGw,
  ConnectorGoogleSheetsGw,
  ConnectorNotionGw,
  ConnectorAirtableGw,
  ConnectorTrelloGw,
  ConnectorGitHubGw,
  ConnectorMailchimpGw,
  ConnectorConvertKitGw,
  ConnectorFtpGw,
} from '../gateways';
import { parseOptions } from './parserHelpers';
import { decryptConnectorConfig } from './connectorMisc';

export const sendWithConnector = async (params: ConnectorSendParams): Promise<OpResult> => {
  const { connector, form, formFields, submissionData } = params || {};

  const connectorConfig = decryptConnectorConfig(connector);

  switch (connector.connectorType) {
    default:
      return OpResult.fail(
        OP_RESULT_CODES.VALIDATION_FAILED,
        {},
        `The connector ${connector.id} has unsupported type '${connector.connectorType}'`,
      );

    case CONNECTOR_TYPES.HTTP:
      {
        const httpGw = new ConnectorWebhookHttpGw();
        const config = parseOptions<HttpConnectorConfig>(connectorConfig, {
          url: '',
          verb: 'POST',
          headers: [],
        });

        httpGw.configure(config);

        return await httpGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AZURE_STORAGE_ACCOUNT_QUEUE:
      {
        const azureQueueGw = new ConnectorAzureQueueGw();
        const config = parseOptions<AzureQueueConnectorConfig>(connectorConfig, {
          connectionString: '',
          queueName: '',
          messageTtlSeconds: 604800, // 7 days default
        });

        azureQueueGw.configure(config);

        return await azureQueueGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AZURE_STORAGE_ACCOUNT_BLOB:
      {
        const azureBlobGw = new ConnectorAzureBlobGw();
        const config = parseOptions<AzureBlobConnectorConfig>(connectorConfig, {
          connectionString: '',
          containerName: '',
          pathPrefix: '',
          fileNamePattern: '{{requestId}}.json',
        });

        azureBlobGw.configure(config);

        return await azureBlobGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AZURE_STORAGE_ACCOUNT_TABLE:
      {
        const azureTableGw = new ConnectorAzureTableGw();
        const config = parseOptions<AzureTableConnectorConfig>(connectorConfig, {
          connectionString: '',
          tableName: '',
          partitionKey: '{{formId}}',
          rowKey: '{{requestId}}',
        });

        azureTableGw.configure(config);

        return await azureTableGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AZURE_SERVICE_BUS:
      {
        const azureServiceBusGw = new ConnectorAzureServiceBusGw();
        const config = parseOptions<AzureServiceBusConnectorConfig>(connectorConfig, {
          connectionString: '',
          queueName: '',
          topicName: '',
          messageSubject: '',
          messageLabel: '',
        });

        azureServiceBusGw.configure(config);

        return await azureServiceBusGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AZURE_EVENT_GRID:
      {
        const azureEventGridGw = new ConnectorAzureEventGridGw();
        const config = parseOptions<AzureEventGridConnectorConfig>(connectorConfig, {
          topicEndpoint: '',
          accessKey: '',
          eventType: 'FormSubmission',
          subject: '/forms/{{formId}}/submissions/{{requestId}}',
          dataVersion: '1.0',
        });

        azureEventGridGw.configure(config);

        return await azureEventGridGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AWS_S3:
      {
        const awsS3Gw = new ConnectorAwsS3Gw();
        const config = parseOptions<AwsS3ConnectorConfig>(connectorConfig, {
          accessKeyId: '',
          secretAccessKey: '',
          region: '',
          bucketName: '',
          pathPrefix: '',
          fileNamePattern: '{{requestId}}.json',
        });

        awsS3Gw.configure(config);

        return await awsS3Gw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AWS_SQS:
      {
        const awsSqsGw = new ConnectorAwsSqsGw();
        const config = parseOptions<AwsSqsConnectorConfig>(connectorConfig, {
          accessKeyId: '',
          secretAccessKey: '',
          region: '',
          queueUrl: '',
          messageGroupId: '',
          messageDeduplicationId: '',
          delaySeconds: 0,
        });

        awsSqsGw.configure(config);

        return await awsSqsGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AWS_SNS:
      {
        const awsSnsGw = new ConnectorAwsSnsGw();
        const config = parseOptions<AwsSnsConnectorConfig>(connectorConfig, {
          accessKeyId: '',
          secretAccessKey: '',
          region: '',
          topicArn: '',
          messageSubject: '',
          messageGroupId: '',
          messageDeduplicationId: '',
        });

        awsSnsGw.configure(config);

        return await awsSnsGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AWS_EVENTBRIDGE:
      {
        const awsEventBridgeGw = new ConnectorAwsEventBridgeGw();
        const config = parseOptions<AwsEventBridgeConnectorConfig>(connectorConfig, {
          accessKeyId: '',
          secretAccessKey: '',
          region: '',
          eventBusName: 'default',
          source: 'formsubmits',
          detailType: 'FormSubmission',
        });

        awsEventBridgeGw.configure(config);

        return await awsEventBridgeGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AWS_DYNAMODB:
      {
        const awsDynamoDbGw = new ConnectorAwsDynamoDbGw();
        const config = parseOptions<AwsDynamoDbConnectorConfig>(connectorConfig, {
          accessKeyId: '',
          secretAccessKey: '',
          region: '',
          tableName: '',
          partitionKey: { name: 'pk', value: '{{formId}}' },
          sortKey: { name: 'sk', value: '{{requestId}}' },
          ttlAttribute: '',
          ttlDays: 365,
        });

        awsDynamoDbGw.configure(config);

        return await awsDynamoDbGw.send(params);
      }
      break;

    // =========================================================================
    // GCP Connectors
    // =========================================================================

    case CONNECTOR_TYPES.GCP_STORAGE:
      {
        const gcpStorageGw = new ConnectorGcpStorageGw();
        const config = parseOptions<GcpStorageConnectorConfig>(connectorConfig, {
          projectId: '',
          credentials: '',
          bucketName: '',
          pathPrefix: '',
          fileNamePattern: '{{requestId}}.json',
        });

        gcpStorageGw.configure(config);

        return await gcpStorageGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.GCP_PUBSUB:
      {
        const gcpPubSubGw = new ConnectorGcpPubSubGw();
        const config = parseOptions<GcpPubSubConnectorConfig>(connectorConfig, {
          projectId: '',
          credentials: '',
          topicName: '',
          orderingKey: '',
        });

        gcpPubSubGw.configure(config);

        return await gcpPubSubGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.GCP_FIRESTORE:
      {
        const gcpFirestoreGw = new ConnectorGcpFirestoreGw();
        const config = parseOptions<GcpFirestoreConnectorConfig>(connectorConfig, {
          projectId: '',
          credentials: '',
          databaseId: '(default)',
          collection: '',
          documentIdPattern: '{{requestId}}',
          ttlField: '',
          ttlDays: 365,
        });

        gcpFirestoreGw.configure(config);

        return await gcpFirestoreGw.send(params);
      }
      break;

    // =========================================================================
    // Messaging Connectors
    // =========================================================================

    case CONNECTOR_TYPES.SLACK:
      {
        const slackGw = new ConnectorSlackGw();
        const config = parseOptions<SlackConnectorConfig>(connectorConfig, {
          webhookUrl: '',
          showMetadata: true,
          showFiles: true,
          showViewButton: true,
          headerPattern: '📬 New submission: {{formName}}',
        });

        slackGw.configure(config);

        return await slackGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.TELEGRAM:
      {
        const telegramGw = new ConnectorTelegramGw();
        const config = parseOptions<TelegramConnectorConfig>(connectorConfig, {
          botToken: '',
          chatId: '',
          showMetadata: true,
          showFiles: true,
          showViewButton: true,
          headerPattern: '📬 New submission: {{formName}}',
        });

        telegramGw.configure(config);

        return await telegramGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.DISCORD:
      {
        const discordGw = new ConnectorDiscordGw();
        const config = parseOptions<DiscordConnectorConfig>(connectorConfig, {
          webhookUrl: '',
          showMetadata: true,
          showFiles: true,
          showViewButton: true,
          headerPattern: '📬 New submission: {{formName}}',
        });

        discordGw.configure(config);

        return await discordGw.send(params);
      }
      break;

    // =========================================================================
    // CRM Connectors
    // =========================================================================

    case CONNECTOR_TYPES.HUBSPOT:
      {
        const hubspotGw = new ConnectorHubSpotGw();
        const config = parseOptions<HubSpotConnectorConfig>(connectorConfig, {
          accessToken: '',
          pipelineId: '',
          stageId: '',
          priority: 'MEDIUM',
          subjectPattern: '{{formName}}: New submission',
          updateExistingContact: true,
        });

        hubspotGw.configure(config);

        return await hubspotGw.send(params);
      }
      break;

    // =========================================================================
    // Productivity Connectors
    // =========================================================================

    case CONNECTOR_TYPES.GOOGLE_SHEETS:
      {
        const googleSheetsGw = new ConnectorGoogleSheetsGw();
        const config = parseOptions<GoogleSheetsConnectorConfig>(connectorConfig, {
          credentials: '',
          spreadsheetId: '',
          sheetName: 'Sheet1',
          includeMetadata: true,
          includeHeaders: true,
        });

        googleSheetsGw.configure(config);

        return await googleSheetsGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.NOTION:
      {
        const notionGw = new ConnectorNotionGw();
        const config = parseOptions<NotionConnectorConfig>(connectorConfig, {
          integrationToken: '',
          databaseId: '',
          includeMetadata: true,
          titleProperty: '',
        });

        notionGw.configure(config);

        return await notionGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.AIRTABLE:
      {
        const airtableGw = new ConnectorAirtableGw();
        const config = parseOptions<AirtableConnectorConfig>(connectorConfig, {
          accessToken: '',
          baseId: '',
          tableName: '',
          includeMetadata: true,
        });

        airtableGw.configure(config);

        return await airtableGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.TRELLO:
      {
        const trelloGw = new ConnectorTrelloGw();
        const config = parseOptions<TrelloConnectorConfig>(connectorConfig, {
          apiKey: '',
          apiToken: '',
          listId: '',
          namePattern: '{{formName}}: New submission',
          includeMetadata: true,
        });

        trelloGw.configure(config);

        return await trelloGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.GITHUB:
      {
        const githubGw = new ConnectorGitHubGw();
        const config = parseOptions<GitHubConnectorConfig>(connectorConfig, {
          accessToken: '',
          owner: '',
          repo: '',
          titlePattern: '{{formName}}: New submission',
          labels: '',
          includeMetadata: true,
        });

        githubGw.configure(config);

        return await githubGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.MAILCHIMP:
      {
        const mailchimpGw = new ConnectorMailchimpGw();
        const config = parseOptions<MailchimpConnectorConfig>(connectorConfig, {
          apiKey: '',
          audienceId: '',
          existingSubscriberAction: 'update',
          status: 'subscribed',
          autoMapFields: true,
        });

        mailchimpGw.configure(config);

        return await mailchimpGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.CONVERTKIT:
      {
        const convertkitGw = new ConnectorConvertKitGw();
        const config = parseOptions<ConvertKitConnectorConfig>(connectorConfig, {
          apiSecret: '',
          formId: '',
          tagId: '',
          autoMapFields: true,
        });

        convertkitGw.configure(config);

        return await convertkitGw.send(params);
      }
      break;

    case CONNECTOR_TYPES.FTP:
    case CONNECTOR_TYPES.FTPS:
      {
        const ftpGw = new ConnectorFtpGw();

        // Determine if secure based on connector type
        const isSecure = connector.connectorType === CONNECTOR_TYPES.FTPS;

        const config = parseOptions<FtpConnectorConfig>(connectorConfig, {
          host: '',
          port: 21,
          username: '',
          password: '',
          pathPrefix: '/',
          rejectUnauthorized: true,
          secureImplicit: false,
        });

        // Force secure flag based on connector type
        config.secure = isSecure;

        ftpGw.configure(config);

        return await ftpGw.send(params);
      }
      break;

    // TODO: Add other connector types
  }

  return OpResult.ok();
};
