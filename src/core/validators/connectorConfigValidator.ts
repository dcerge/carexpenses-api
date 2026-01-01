// ./src/core/validators/connectorConfigValidator.ts
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import {
  parseOptions,
  validateCustomHeaders,
  validateExternalUrl,
  validatePathPrefix,
  validateFileNamePattern,
  validateResourceName,
} from '../../utils';
import {
  SendGridConnectorConfig,
  SmtpConnectorConfig,
  AwsSesConnectorConfig,
  HttpConnectorConfig,
  SlackConnectorConfig,
  DiscordConnectorConfig,
  TelegramConnectorConfig,
  FtpConnectorConfig,
  AzureBlobConnectorConfig,
  AzureQueueConnectorConfig,
  AzureTableConnectorConfig,
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
  HubSpotConnectorConfig,
  GoogleSheetsConnectorConfig,
  NotionConnectorConfig,
  AirtableConnectorConfig,
  TrelloConnectorConfig,
  GitHubConnectorConfig,
  MailchimpConnectorConfig,
  ConvertKitConnectorConfig,
  CONNECTOR_TYPES,
} from '../../boundary';

// =============================================================================
// Types
// =============================================================================

type ConnectorValidator = (configJson: string) => Promise<OpResult>;

// =============================================================================
// Constants
// =============================================================================

const ALLOWED_HTTP_VERBS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const AWS_REGION_REGEX = /^[a-z]{2}-[a-z]+-\d+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// Helper Functions
// =============================================================================

async function validateSmtpHost(host: string, fieldName = 'host'): Promise<OpResult> {
  const result = new OpResult();

  if (!host || host.trim() === '') {
    result.addError(fieldName, 'SMTP host is required', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Build a fake URL to reuse our URL validation
  // Using https:// since we just need hostname validation
  const fakeUrl = `https://${host}`;
  const urlValidation = await validateExternalUrl(fakeUrl, fieldName, ['https:']);

  if (urlValidation.hasErrors()) {
    urlValidation.errors.forEach((err) => {
      // Adjust error messages to be about host, not URL
      const messages = Array.isArray(err.errors) ? err.errors : [err.errors];
      messages.forEach((message) => {
        const adjustedMessage = message
          .replace('URL', 'host')
          .replace('Only https: protocols are allowed', 'Invalid host format');
        result.addError(fieldName, adjustedMessage, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    });
  }

  return result;
}

/**
 * Validate AWS authentication fields common to all AWS connectors
 */
function validateAwsAuth(config: { accessKeyId?: string; secretAccessKey?: string; region?: string }): OpResult {
  const result = new OpResult();

  if (!config.accessKeyId || config.accessKeyId.trim() === '') {
    result.addError('accessKeyId', 'AWS Access Key ID is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.secretAccessKey || config.secretAccessKey.trim() === '') {
    result.addError('secretAccessKey', 'AWS Secret Access Key is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.region || config.region.trim() === '') {
    result.addError('region', 'AWS Region is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else if (!AWS_REGION_REGEX.test(config.region)) {
    result.addError('region', 'AWS Region format is invalid (expected: us-east-1)', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

/**
 * Validate GCP authentication fields
 */
function validateGcpAuth(config: { projectId?: string; credentials?: string }): OpResult {
  const result = new OpResult();

  if (!config.projectId || config.projectId.trim() === '') {
    result.addError('projectId', 'GCP Project ID is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.credentials || config.credentials.trim() === '') {
    result.addError('credentials', 'GCP Service Account credentials are required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    // Validate it's valid JSON
    try {
      const creds = JSON.parse(config.credentials);
      if (!creds.type || creds.type !== 'service_account') {
        result.addError('credentials', 'Credentials must be a service account key', OP_RESULT_CODES.VALIDATION_FAILED);
      }
      if (!creds.private_key) {
        result.addError('credentials', 'Credentials missing private_key', OP_RESULT_CODES.VALIDATION_FAILED);
      }
      if (!creds.client_email) {
        result.addError('credentials', 'Credentials missing client_email', OP_RESULT_CODES.VALIDATION_FAILED);
      }
    } catch {
      result.addError('credentials', 'Credentials must be valid JSON', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  return result;
}

/**
 * Validate Azure connection string format
 */
function validateAzureConnectionString(connectionString: string, fieldName = 'connectionString'): OpResult {
  const result = new OpResult();

  if (!connectionString || connectionString.trim() === '') {
    result.addError(fieldName, 'Connection string is required', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Basic format check - should contain key components
  const requiredParts = ['AccountName=', 'AccountKey='];
  const hasRequiredParts = requiredParts.every((part) => connectionString.includes(part));

  // Alternative: could be using DefaultEndpointsProtocol or UseDevelopmentStorage
  const isValidFormat =
    hasRequiredParts ||
    connectionString.includes('SharedAccessSignature=') ||
    connectionString === 'UseDevelopmentStorage=true';

  if (!isValidFormat) {
    result.addError(fieldName, 'Invalid Azure Storage connection string format', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

/**
 * Validate FTP/FTPS host for SSRF
 */
async function validateFtpHost(host: string, fieldName = 'host', secure: boolean = false): Promise<OpResult> {
  const result = new OpResult();

  if (!host || host.trim() === '') {
    result.addError(fieldName, 'FTP host is required', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Build a fake URL to reuse our URL validation
  const fakeUrl = secure ? `ftps://${host}` : `ftp://${host}`;
  const urlValidation = await validateExternalUrl(fakeUrl, fieldName, secure ? ['ftps:'] : ['ftp:']);

  // Copy errors but adjust message (since we validated as URL)
  if (urlValidation.hasErrors()) {
    const errors = urlValidation.errors;
    errors.forEach((err) => {
      result.addError(fieldName, err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  return result;
}

// =============================================================================
// Email Connector Validators
// =============================================================================

async function validateSendGridConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<SendGridConnectorConfig>(configJson, {
    apiKey: '',
    fromAccountEmailId: '',
    categories: [],
    customArgs: {},
    sandboxMode: false,
  });

  if (!config.apiKey || config.apiKey.trim() === '') {
    result.addError('apiKey', 'SendGrid API Key is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.fromAccountEmailId || config.fromAccountEmailId.trim() === '') {
    result.addError('fromAccountEmailId', 'Sender email is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  // Optional enhancement for email connectors
  if (config.fromAccountEmailId && !UUID_REGEX.test(config.fromAccountEmailId)) {
    result.addError('fromAccountEmailId', 'Invalid account email ID format', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.categories && config.categories.length > 0) {
    if (config.categories.length > 10) {
      result.addError('categories', 'SendGrid allows maximum 10 categories', OP_RESULT_CODES.VALIDATION_FAILED);
    }

    config.categories.forEach((cat, index) => {
      if (typeof cat !== 'string') {
        result.addError('categories', `Category at index ${index} must be a string`, OP_RESULT_CODES.VALIDATION_FAILED);
      } else if (cat.length > 255) {
        result.addError(
          'categories',
          `Category "${cat.substring(0, 20)}..." exceeds 255 character limit`,
          OP_RESULT_CODES.VALIDATION_FAILED,
        );
      }
    });
  }

  if (config.customArgs && Object.keys(config.customArgs).length > 0) {
    const headerValidation = validateCustomHeaders(config.customArgs);
    if (!headerValidation.valid) {
      (headerValidation.errors || []).forEach((err) => {
        result.addError('customArgs', err, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }

    if (Object.keys(config.customArgs).length > 10) {
      result.addError('customArgs', 'SendGrid allows maximum 10 custom arguments', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  return result;
}

async function validateSmtpConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<SmtpConnectorConfig>(configJson, {
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromAccountEmailId: '',
    customHeaders: {},
    rejectUnauthorized: true,
  });

  if (!config.host || config.host.trim() === '') {
    result.addError('host', 'SMTP host is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    const hostValidation = await validateSmtpHost(config.host, 'host');
    if (hostValidation.hasErrors()) {
      hostValidation.errors.forEach((err) => {
        result.addError(err.name || 'host', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  if (!config.username || config.username.trim() === '') {
    result.addError('username', 'SMTP username is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.password || config.password.trim() === '') {
    result.addError('password', 'SMTP password is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.fromAccountEmailId || config.fromAccountEmailId.trim() === '') {
    result.addError('fromAccountEmailId', 'Sender email is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.port !== undefined) {
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      result.addError('port', 'SMTP port must be a valid port number (1-65535)', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  // Optional enhancement for email connectors
  if (config.fromAccountEmailId && !UUID_REGEX.test(config.fromAccountEmailId)) {
    result.addError('fromAccountEmailId', 'Invalid account email ID format', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.customHeaders && Object.keys(config.customHeaders).length > 0) {
    const headerValidation = validateCustomHeaders(config.customHeaders);
    if (!headerValidation.valid) {
      (headerValidation.errors || []).forEach((err) => {
        result.addError('customHeaders', err, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  return result;
}

async function validateAwsSesConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AwsSesConnectorConfig>(configJson, {
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    fromAccountEmailId: '',
    configurationSetName: '',
    messageTags: {},
  });

  // Validate AWS auth
  const authValidation = validateAwsAuth(config);
  if (authValidation.hasErrors()) {
    authValidation.errors.forEach((err) => {
      result.addError(err.name || '', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  if (!config.fromAccountEmailId || config.fromAccountEmailId.trim() === '') {
    result.addError('fromAccountEmailId', 'Sender email is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  // Optional enhancement for email connectors
  if (config.fromAccountEmailId && !UUID_REGEX.test(config.fromAccountEmailId)) {
    result.addError('fromAccountEmailId', 'Invalid account email ID format', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.messageTags && Object.keys(config.messageTags).length > 0) {
    const headerValidation = validateCustomHeaders(config.messageTags);
    if (!headerValidation.valid) {
      (headerValidation.errors || []).forEach((err) => {
        result.addError('messageTags', err, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }

    if (Object.keys(config.messageTags).length > 10) {
      result.addError('messageTags', 'AWS SES allows maximum 10 message tags', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  return result;
}

// =============================================================================
// Webhook Connector Validators
// =============================================================================

async function validateHttpConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<HttpConnectorConfig>(configJson, {
    url: '',
    verb: 'POST',
    headers: [],
  });

  if (!config.url || config.url.trim() === '') {
    result.addError('url', 'Webhook URL is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    const urlValidation = await validateExternalUrl(config.url, 'url');
    if (urlValidation.hasErrors()) {
      urlValidation.errors.forEach((err) => {
        result.addError(err.name || 'url', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  if (!config.verb || config.verb.trim() === '') {
    result.addError('verb', 'HTTP verb is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    const verb = config.verb.toUpperCase();
    if (!ALLOWED_HTTP_VERBS.includes(verb)) {
      result.addError(
        'verb',
        `HTTP verb must be one of: ${ALLOWED_HTTP_VERBS.join(', ')}`,
        OP_RESULT_CODES.VALIDATION_FAILED,
      );
    }
  }

  if (config.headers && Array.isArray(config.headers)) {
    if (config.headers.length > 50) {
      result.addError('headers', 'Maximum 50 headers allowed', OP_RESULT_CODES.VALIDATION_FAILED);
    }

    config.headers.forEach((header, index) => {
      if (!header.name || header.name.trim() === '') {
        result.addError(`headers[${index}].name`, 'Header name is required', OP_RESULT_CODES.VALIDATION_FAILED);
      }

      if (header.value === undefined || header.value === null) {
        result.addError(`headers[${index}].value`, 'Header value is required', OP_RESULT_CODES.VALIDATION_FAILED);
      }

      if (header.name && !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(header.name)) {
        result.addError(`headers[${index}].name`, 'Header name format is invalid', OP_RESULT_CODES.VALIDATION_FAILED);
      }

      if (header.value && /[\r\n]/.test(header.value)) {
        result.addError(
          `headers[${index}].value`,
          'Header value contains invalid characters',
          OP_RESULT_CODES.VALIDATION_FAILED,
        );
      }
    });

    const headersRecord: Record<string, string> = {};
    for (const header of config.headers) {
      if (header.name && header.name.trim() !== '') {
        headersRecord[header.name] = header.value || '';
      }
    }

    if (Object.keys(headersRecord).length > 0) {
      const headerValidation = validateCustomHeaders(headersRecord);
      if (!headerValidation.valid) {
        (headerValidation.errors || []).forEach((err) => {
          result.addError('headers', err, OP_RESULT_CODES.VALIDATION_FAILED);
        });
      }
    }
  }

  return result;
}

// =============================================================================
// Messenger Connector Validators
// =============================================================================

async function validateSlackConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<SlackConnectorConfig>(configJson, {
    webhookUrl: '',
    showMetadata: true,
    showFiles: true,
    showViewButton: true,
    headerPattern: '',
  });

  if (!config.webhookUrl || config.webhookUrl.trim() === '') {
    result.addError('webhookUrl', 'Slack webhook URL is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    // Validate it's a Slack webhook URL
    if (!config.webhookUrl.startsWith('https://hooks.slack.com/')) {
      result.addError(
        'webhookUrl',
        'Must be a valid Slack webhook URL (https://hooks.slack.com/...)',
        OP_RESULT_CODES.VALIDATION_FAILED,
      );
    } else {
      // Still validate for SSRF (in case of redirect exploits)
      const urlValidation = await validateExternalUrl(config.webhookUrl, 'webhookUrl');
      if (urlValidation.hasErrors()) {
        urlValidation.errors.forEach((err) => {
          result.addError(err.name || 'webhookUrl', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
        });
      }
    }
  }

  if (config.headerPattern && config.headerPattern.length > 500) {
    result.addError('headerPattern', 'Header pattern exceeds maximum length (500)', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

async function validateDiscordConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<DiscordConnectorConfig>(configJson, {
    webhookUrl: '',
    showMetadata: true,
    showFiles: true,
    showViewButton: true,
    headerPattern: '',
  });

  if (!config.webhookUrl || config.webhookUrl.trim() === '') {
    result.addError('webhookUrl', 'Discord webhook URL is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    // Validate it's a Discord webhook URL
    if (
      !config.webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
      !config.webhookUrl.startsWith('https://discordapp.com/api/webhooks/')
    ) {
      result.addError('webhookUrl', 'Must be a valid Discord webhook URL', OP_RESULT_CODES.VALIDATION_FAILED);
    } else {
      const urlValidation = await validateExternalUrl(config.webhookUrl, 'webhookUrl');
      if (urlValidation.hasErrors()) {
        urlValidation.errors.forEach((err) => {
          result.addError(err.name || 'webhookUrl', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
        });
      }
    }
  }

  if (config.headerPattern && config.headerPattern.length > 500) {
    result.addError('headerPattern', 'Header pattern exceeds maximum length (500)', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

async function validateTelegramConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<TelegramConnectorConfig>(configJson, {
    botToken: '',
    chatId: '',
    showMetadata: true,
    showFiles: true,
    showViewButton: true,
    headerPattern: '',
  });

  if (!config.botToken || config.botToken.trim() === '') {
    result.addError('botToken', 'Telegram bot token is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    // Telegram bot tokens have format: 123456789:ABCdefGHIjklmNOPQRstUVwxyz
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(config.botToken)) {
      result.addError('botToken', 'Invalid Telegram bot token format', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  if (!config.chatId || config.chatId.trim() === '') {
    result.addError('chatId', 'Telegram chat ID is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    // Chat ID can be numeric (user/group) or @username (channel)
    if (!/^-?\d+$/.test(config.chatId) && !/^@[a-zA-Z][a-zA-Z0-9_]{4,}$/.test(config.chatId)) {
      result.addError(
        'chatId',
        'Invalid chat ID format (use numeric ID or @channelname)',
        OP_RESULT_CODES.VALIDATION_FAILED,
      );
    }
  }

  if (config.headerPattern && config.headerPattern.length > 500) {
    result.addError('headerPattern', 'Header pattern exceeds maximum length (500)', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

// =============================================================================
// FTP Connector Validator
// =============================================================================

async function validateFtpConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<FtpConnectorConfig>(configJson, {
    host: '',
    port: 21,
    username: '',
    password: '',
    secure: false,
    pathPrefix: '/',
    fileNamePattern: '{{requestId}}.json',
    rejectUnauthorized: true,
    secureImplicit: false,
  });

  // Validate host for SSRF
  const hostValidation = await validateFtpHost(config.host, 'host', config.secure);
  if (hostValidation.hasErrors()) {
    hostValidation.errors.forEach((err) => {
      result.addError(err.name || 'host', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  if (config.port !== undefined) {
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      result.addError('port', 'Port must be a valid port number (1-65535)', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  if (!config.username || config.username.trim() === '') {
    result.addError('username', 'FTP username is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.password || config.password.trim() === '') {
    result.addError('password', 'FTP password is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  // Validate path prefix for traversal attacks
  if (config.pathPrefix) {
    const pathValidation = validatePathPrefix(config.pathPrefix, 'pathPrefix');
    if (pathValidation.hasErrors()) {
      pathValidation.errors.forEach((err) => {
        result.addError(err.name || 'pathPrefix', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  // Validate file name pattern
  if (config.fileNamePattern) {
    const patternValidation = validateFileNamePattern(config.fileNamePattern, 'fileNamePattern');
    if (patternValidation.hasErrors()) {
      patternValidation.errors.forEach((err) => {
        result.addError(err.name || 'fileNamePattern', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  return result;
}

// =============================================================================
// Azure Connector Validators
// =============================================================================

async function validateAzureBlobConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AzureBlobConnectorConfig>(configJson, {
    connectionString: '',
    containerName: '',
    pathPrefix: '',
    fileNamePattern: '{{requestId}}.json',
  });

  const connStringValidation = validateAzureConnectionString(config.connectionString);
  if (connStringValidation.hasErrors()) {
    connStringValidation.errors.forEach((err) => {
      result.addError(err.name || 'connectionString', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  const containerValidation = validateResourceName(config.containerName, 'containerName', { maxLength: 63 });
  if (containerValidation.hasErrors()) {
    containerValidation.errors.forEach((err) => {
      result.addError(err.name || 'containerName', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  if (config.pathPrefix) {
    const pathValidation = validatePathPrefix(config.pathPrefix, 'pathPrefix');
    if (pathValidation.hasErrors()) {
      pathValidation.errors.forEach((err) => {
        result.addError(err.name || 'pathPrefix', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  if (config.fileNamePattern) {
    const patternValidation = validateFileNamePattern(config.fileNamePattern, 'fileNamePattern');
    if (patternValidation.hasErrors()) {
      patternValidation.errors.forEach((err) => {
        result.addError(err.name || 'fileNamePattern', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  return result;
}

async function validateAzureQueueConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AzureQueueConnectorConfig>(configJson, {
    connectionString: '',
    queueName: '',
    messageTtlSeconds: 604800,
  });

  const connStringValidation = validateAzureConnectionString(config.connectionString);
  if (connStringValidation.hasErrors()) {
    connStringValidation.errors.forEach((err) => {
      result.addError(err.name || 'connectionString', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  const queueValidation = validateResourceName(config.queueName, 'queueName', { maxLength: 63 });
  if (queueValidation.hasErrors()) {
    queueValidation.errors.forEach((err) => {
      result.addError(err.name || 'queueName', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  if (config.messageTtlSeconds !== undefined && config.messageTtlSeconds !== -1) {
    if (config.messageTtlSeconds < 1 || config.messageTtlSeconds > 604800) {
      result.addError(
        'messageTtlSeconds',
        'Message TTL must be between 1-604800 seconds or -1 for never',
        OP_RESULT_CODES.VALIDATION_FAILED,
      );
    }
  }

  return result;
}

async function validateAzureTableConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AzureTableConnectorConfig>(configJson, {
    connectionString: '',
    tableName: '',
    partitionKey: '{{formId}}',
    rowKey: '{{requestId}}',
  });

  const connStringValidation = validateAzureConnectionString(config.connectionString);
  if (connStringValidation.hasErrors()) {
    connStringValidation.errors.forEach((err) => {
      result.addError(err.name || 'connectionString', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  const tableValidation = validateResourceName(config.tableName, 'tableName', { maxLength: 63 });
  if (tableValidation.hasErrors()) {
    tableValidation.errors.forEach((err) => {
      result.addError(err.name || 'tableName', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  // Validate partition/row key patterns for dangerous characters
  if (config.partitionKey) {
    // Azure Table partition keys cannot contain / \ # ?
    if (/[/\\#?]/.test(config.partitionKey.replace(/\{\{[^}]+\}\}/g, ''))) {
      result.addError('partitionKey', 'Partition key cannot contain / \\ # ?', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  if (config.rowKey) {
    if (/[/\\#?]/.test(config.rowKey.replace(/\{\{[^}]+\}\}/g, ''))) {
      result.addError('rowKey', 'Row key cannot contain / \\ # ?', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  return result;
}

async function validateAzureServiceBusConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AzureServiceBusConnectorConfig>(configJson, {
    connectionString: '',
    queueName: '',
    topicName: '',
    messageSubject: '',
    messageLabel: '',
  });

  // Service Bus uses a different connection string format
  if (!config.connectionString || config.connectionString.trim() === '') {
    result.addError('connectionString', 'Connection string is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else if (!config.connectionString.includes('Endpoint=sb://')) {
    result.addError(
      'connectionString',
      'Invalid Service Bus connection string format',
      OP_RESULT_CODES.VALIDATION_FAILED,
    );
  }

  // Must have either queue or topic, not both
  if (!config.queueName && !config.topicName) {
    result.addError('queueName', 'Either queue name or topic name is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.queueName && config.topicName) {
    result.addError(
      'queueName',
      'Specify either queue name or topic name, not both',
      OP_RESULT_CODES.VALIDATION_FAILED,
    );
  }

  return result;
}

async function validateAzureEventGridConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AzureEventGridConnectorConfig>(configJson, {
    topicEndpoint: '',
    accessKey: '',
    eventType: 'FormSubmission',
    subject: '/forms/{{formId}}/submissions/{{requestId}}',
    dataVersion: '1.0',
  });

  if (!config.topicEndpoint || config.topicEndpoint.trim() === '') {
    result.addError('topicEndpoint', 'Event Grid topic endpoint is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    // Validate it's an Azure Event Grid endpoint
    if (!config.topicEndpoint.includes('.eventgrid.azure.net')) {
      result.addError('topicEndpoint', 'Must be a valid Azure Event Grid endpoint', OP_RESULT_CODES.VALIDATION_FAILED);
    } else {
      const urlValidation = await validateExternalUrl(config.topicEndpoint, 'topicEndpoint');
      if (urlValidation.hasErrors()) {
        urlValidation.errors.forEach((err) => {
          result.addError(err.name || 'topicEndpoint', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
        });
      }
    }
  }

  if (!config.accessKey || config.accessKey.trim() === '') {
    result.addError('accessKey', 'Event Grid access key is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

// =============================================================================
// AWS Connector Validators
// =============================================================================

async function validateAwsS3ConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AwsS3ConnectorConfig>(configJson, {
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    bucketName: '',
    pathPrefix: '',
    fileNamePattern: '{{requestId}}.json',
  });

  const authValidation = validateAwsAuth(config);
  if (authValidation.hasErrors()) {
    authValidation.errors.forEach((err) => {
      result.addError(err.name || '', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  const bucketValidation = validateResourceName(config.bucketName, 'bucketName', { maxLength: 63 });
  if (bucketValidation.hasErrors()) {
    bucketValidation.errors.forEach((err) => {
      result.addError(err.name || 'bucketName', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  if (config.pathPrefix) {
    const pathValidation = validatePathPrefix(config.pathPrefix, 'pathPrefix');
    if (pathValidation.hasErrors()) {
      pathValidation.errors.forEach((err) => {
        result.addError(err.name || 'pathPrefix', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  if (config.fileNamePattern) {
    const patternValidation = validateFileNamePattern(config.fileNamePattern, 'fileNamePattern');
    if (patternValidation.hasErrors()) {
      patternValidation.errors.forEach((err) => {
        result.addError(err.name || 'fileNamePattern', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  return result;
}

async function validateAwsSqsConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AwsSqsConnectorConfig>(configJson, {
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    queueUrl: '',
    messageGroupId: '',
    messageDeduplicationId: '',
    delaySeconds: 0,
  });

  const authValidation = validateAwsAuth(config);
  if (authValidation.hasErrors()) {
    authValidation.errors.forEach((err) => {
      result.addError(err.name || '', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  if (!config.queueUrl || config.queueUrl.trim() === '') {
    result.addError('queueUrl', 'SQS queue URL is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    // Must be a valid SQS URL
    if (!config.queueUrl.includes('sqs.') || !config.queueUrl.includes('.amazonaws.com')) {
      result.addError('queueUrl', 'Must be a valid AWS SQS queue URL', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  if (config.delaySeconds !== undefined) {
    if (config.delaySeconds < 0 || config.delaySeconds > 900) {
      result.addError('delaySeconds', 'Delay must be between 0-900 seconds', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  return result;
}

async function validateAwsSnsConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AwsSnsConnectorConfig>(configJson, {
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    topicArn: '',
    messageSubject: '',
    messageGroupId: '',
    messageDeduplicationId: '',
  });

  const authValidation = validateAwsAuth(config);
  if (authValidation.hasErrors()) {
    authValidation.errors.forEach((err) => {
      result.addError(err.name || '', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  if (!config.topicArn || config.topicArn.trim() === '') {
    result.addError('topicArn', 'SNS topic ARN is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    // Must be a valid SNS ARN
    if (!config.topicArn.startsWith('arn:aws:sns:')) {
      result.addError('topicArn', 'Must be a valid AWS SNS topic ARN', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  return result;
}

async function validateAwsEventBridgeConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AwsEventBridgeConnectorConfig>(configJson, {
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    eventBusName: 'default',
    source: 'formsubmits',
    detailType: 'FormSubmission',
  });

  const authValidation = validateAwsAuth(config);
  if (authValidation.hasErrors()) {
    authValidation.errors.forEach((err) => {
      result.addError(err.name || '', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  return result;
}

async function validateAwsDynamoDbConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AwsDynamoDbConnectorConfig>(configJson, {
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    tableName: '',
    partitionKey: { name: 'pk', value: '{{formId}}' },
    sortKey: { name: 'sk', value: '{{requestId}}' },
    ttlAttribute: '',
    ttlDays: 365,
  });

  const authValidation = validateAwsAuth(config);
  if (authValidation.hasErrors()) {
    authValidation.errors.forEach((err) => {
      result.addError(err.name || '', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  const tableValidation = validateResourceName(config.tableName, 'tableName', { maxLength: 255 });
  if (tableValidation.hasErrors()) {
    tableValidation.errors.forEach((err) => {
      result.addError(err.name || 'tableName', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  if (config.ttlDays !== undefined) {
    if (config.ttlDays < 1 || config.ttlDays > 3650) {
      result.addError('ttlDays', 'TTL days must be between 1-3650', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  return result;
}

// =============================================================================
// GCP Connector Validators
// =============================================================================

async function validateGcpStorageConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<GcpStorageConnectorConfig>(configJson, {
    projectId: '',
    credentials: '',
    bucketName: '',
    pathPrefix: '',
    fileNamePattern: '{{requestId}}.json',
  });

  const authValidation = validateGcpAuth(config);
  if (authValidation.hasErrors()) {
    authValidation.errors.forEach((err) => {
      result.addError(err.name || '', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  const bucketValidation = validateResourceName(config.bucketName, 'bucketName', { maxLength: 63 });
  if (bucketValidation.hasErrors()) {
    bucketValidation.errors.forEach((err) => {
      result.addError(err.name || 'bucketName', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  if (config.pathPrefix) {
    const pathValidation = validatePathPrefix(config.pathPrefix, 'pathPrefix');
    if (pathValidation.hasErrors()) {
      pathValidation.errors.forEach((err) => {
        result.addError(err.name || 'pathPrefix', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  if (config.fileNamePattern) {
    const patternValidation = validateFileNamePattern(config.fileNamePattern, 'fileNamePattern');
    if (patternValidation.hasErrors()) {
      patternValidation.errors.forEach((err) => {
        result.addError(err.name || 'fileNamePattern', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
      });
    }
  }

  return result;
}

async function validateGcpPubSubConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<GcpPubSubConnectorConfig>(configJson, {
    projectId: '',
    credentials: '',
    topicName: '',
    orderingKey: '',
  });

  const authValidation = validateGcpAuth(config);
  if (authValidation.hasErrors()) {
    authValidation.errors.forEach((err) => {
      result.addError(err.name || '', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  const topicValidation = validateResourceName(config.topicName, 'topicName', { maxLength: 255 });
  if (topicValidation.hasErrors()) {
    topicValidation.errors.forEach((err) => {
      result.addError(err.name || 'topicName', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  return result;
}

async function validateGcpFirestoreConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<GcpFirestoreConnectorConfig>(configJson, {
    projectId: '',
    credentials: '',
    databaseId: '(default)',
    collection: '',
    documentIdPattern: '{{requestId}}',
    ttlField: '',
    ttlDays: 365,
  });

  const authValidation = validateGcpAuth(config);
  if (authValidation.hasErrors()) {
    authValidation.errors.forEach((err) => {
      result.addError(err.name || '', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  // Collection can have slashes for subcollections
  const collectionValidation = validateResourceName(config.collection, 'collection', {
    allowSlashes: true,
    maxLength: 1500,
  });
  if (collectionValidation.hasErrors()) {
    collectionValidation.errors.forEach((err) => {
      result.addError(err.name || 'collection', err.errors, OP_RESULT_CODES.VALIDATION_FAILED);
    });
  }

  if (config.ttlDays !== undefined) {
    if (config.ttlDays < 1 || config.ttlDays > 3650) {
      result.addError('ttlDays', 'TTL days must be between 1-3650', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  return result;
}

// =============================================================================
// CRM & Productivity Connector Validators
// =============================================================================

async function validateHubSpotConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<HubSpotConnectorConfig>(configJson, {
    accessToken: '',
    pipelineId: '',
    stageId: '',
    priority: 'MEDIUM',
    subjectPattern: '{{formName}}: New submission',
    updateExistingContact: true,
  });

  if (!config.accessToken || config.accessToken.trim() === '') {
    result.addError('accessToken', 'HubSpot access token is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.priority && !['LOW', 'MEDIUM', 'HIGH'].includes(config.priority)) {
    result.addError('priority', 'Priority must be LOW, MEDIUM, or HIGH', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.subjectPattern && config.subjectPattern.length > 500) {
    result.addError(
      'subjectPattern',
      'Subject pattern exceeds maximum length (500)',
      OP_RESULT_CODES.VALIDATION_FAILED,
    );
  }

  return result;
}

async function validateGoogleSheetsConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<GoogleSheetsConnectorConfig>(configJson, {
    credentials: '',
    spreadsheetId: '',
    sheetName: 'Sheet1',
    includeMetadata: true,
    includeHeaders: true,
  });

  // Credentials are optional (can use shared service account)
  if (config.credentials && config.credentials.trim() !== '') {
    try {
      const creds = JSON.parse(config.credentials);
      if (!creds.type || creds.type !== 'service_account') {
        result.addError('credentials', 'Credentials must be a service account key', OP_RESULT_CODES.VALIDATION_FAILED);
      }
    } catch {
      result.addError('credentials', 'Credentials must be valid JSON', OP_RESULT_CODES.VALIDATION_FAILED);
    }
  }

  if (!config.spreadsheetId || config.spreadsheetId.trim() === '') {
    result.addError('spreadsheetId', 'Spreadsheet ID is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

async function validateNotionConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<NotionConnectorConfig>(configJson, {
    integrationToken: '',
    databaseId: '',
    includeMetadata: true,
    titleProperty: 'Name',
  });

  if (!config.integrationToken || config.integrationToken.trim() === '') {
    result.addError('integrationToken', 'Notion integration token is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else if (!config.integrationToken.startsWith('secret_') && !config.integrationToken.startsWith('ntn_')) {
    result.addError('integrationToken', 'Invalid Notion integration token format', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.databaseId || config.databaseId.trim() === '') {
    result.addError('databaseId', 'Notion database ID is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

async function validateAirtableConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<AirtableConnectorConfig>(configJson, {
    accessToken: '',
    baseId: '',
    tableName: '',
    includeMetadata: true,
  });

  if (!config.accessToken || config.accessToken.trim() === '') {
    result.addError('accessToken', 'Airtable access token is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.baseId || config.baseId.trim() === '') {
    result.addError('baseId', 'Airtable base ID is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else if (!config.baseId.startsWith('app')) {
    result.addError('baseId', 'Airtable base ID should start with "app"', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.tableName || config.tableName.trim() === '') {
    result.addError('tableName', 'Airtable table name is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

async function validateTrelloConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<TrelloConnectorConfig>(configJson, {
    apiKey: '',
    apiToken: '',
    listId: '',
    namePattern: '{{formName}}: New submission',
    includeMetadata: true,
  });

  if (!config.apiKey || config.apiKey.trim() === '') {
    result.addError('apiKey', 'Trello API key is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.apiToken || config.apiToken.trim() === '') {
    result.addError('apiToken', 'Trello API token is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.listId || config.listId.trim() === '') {
    result.addError('listId', 'Trello list ID is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.namePattern && config.namePattern.length > 500) {
    result.addError('namePattern', 'Name pattern exceeds maximum length (500)', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

async function validateGitHubConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<GitHubConnectorConfig>(configJson, {
    accessToken: '',
    owner: '',
    repo: '',
    titlePattern: '{{formName}}: New submission',
    labels: '',
    includeMetadata: true,
  });

  if (!config.accessToken || config.accessToken.trim() === '') {
    result.addError('accessToken', 'GitHub access token is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.owner || config.owner.trim() === '') {
    result.addError('owner', 'Repository owner is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(config.owner)) {
    result.addError('owner', 'Invalid repository owner format', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.repo || config.repo.trim() === '') {
    result.addError('repo', 'Repository name is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else if (!/^[a-zA-Z0-9._-]+$/.test(config.repo)) {
    result.addError('repo', 'Invalid repository name format', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.titlePattern && config.titlePattern.length > 256) {
    result.addError('titlePattern', 'Title pattern exceeds maximum length (256)', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

async function validateMailchimpConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<MailchimpConnectorConfig>(configJson, {
    apiKey: '',
    audienceId: '',
    existingSubscriberAction: 'update',
    status: 'subscribed',
    autoMapFields: true,
  });

  if (!config.apiKey || config.apiKey.trim() === '') {
    result.addError('apiKey', 'Mailchimp API key is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else {
    // Mailchimp API keys end with -usXX (data center)
    if (!/^[a-f0-9]{32}-us\d+$/.test(config.apiKey)) {
      result.addError(
        'apiKey',
        'Invalid Mailchimp API key format (should end with -usXX)',
        OP_RESULT_CODES.VALIDATION_FAILED,
      );
    }
  }

  if (!config.audienceId || config.audienceId.trim() === '') {
    result.addError('audienceId', 'Mailchimp audience ID is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.existingSubscriberAction && !['update', 'skip'].includes(config.existingSubscriberAction)) {
    result.addError('existingSubscriberAction', 'Must be "update" or "skip"', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.status && !['subscribed', 'pending'].includes(config.status)) {
    result.addError('status', 'Must be "subscribed" or "pending"', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

async function validateConvertKitConnectorConfig(configJson: string): Promise<OpResult> {
  const result = new OpResult();

  const config = parseOptions<ConvertKitConnectorConfig>(configJson, {
    apiSecret: '',
    formId: '',
    tagId: '',
    autoMapFields: true,
  });

  if (!config.apiSecret || config.apiSecret.trim() === '') {
    result.addError('apiSecret', 'ConvertKit API secret is required', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (!config.formId || config.formId.trim() === '') {
    result.addError('formId', 'ConvertKit form ID is required', OP_RESULT_CODES.VALIDATION_FAILED);
  } else if (!/^\d+$/.test(config.formId)) {
    result.addError('formId', 'ConvertKit form ID must be numeric', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  if (config.tagId && !/^\d+$/.test(config.tagId)) {
    result.addError('tagId', 'ConvertKit tag ID must be numeric', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

// =============================================================================
// Generic Validator
// =============================================================================

async function validateGenericConfig(_configJson: string): Promise<OpResult> {
  return new OpResult();
}

// =============================================================================
// Validator Registry
// =============================================================================

const validatorRegistry: Record<string, ConnectorValidator> = {
  // Email
  [CONNECTOR_TYPES.SENDGRID]: validateSendGridConfig,
  [CONNECTOR_TYPES.SMTP]: validateSmtpConfig,
  [CONNECTOR_TYPES.AWS_SES]: validateAwsSesConfig,

  // Webhooks
  [CONNECTOR_TYPES.HTTP]: validateHttpConnectorConfig,

  // FTP
  [CONNECTOR_TYPES.FTP]: validateFtpConnectorConfig,
  [CONNECTOR_TYPES.FTPS]: validateFtpConnectorConfig,

  // Azure
  [CONNECTOR_TYPES.AZURE_STORAGE_ACCOUNT_BLOB]: validateAzureBlobConnectorConfig,
  [CONNECTOR_TYPES.AZURE_STORAGE_ACCOUNT_QUEUE]: validateAzureQueueConnectorConfig,
  [CONNECTOR_TYPES.AZURE_STORAGE_ACCOUNT_TABLE]: validateAzureTableConnectorConfig,
  [CONNECTOR_TYPES.AZURE_SERVICE_BUS]: validateAzureServiceBusConnectorConfig,
  [CONNECTOR_TYPES.AZURE_EVENT_GRID]: validateAzureEventGridConnectorConfig,

  // AWS
  [CONNECTOR_TYPES.AWS_S3]: validateAwsS3ConnectorConfig,
  [CONNECTOR_TYPES.AWS_SQS]: validateAwsSqsConnectorConfig,
  [CONNECTOR_TYPES.AWS_SNS]: validateAwsSnsConnectorConfig,
  [CONNECTOR_TYPES.AWS_EVENTBRIDGE]: validateAwsEventBridgeConnectorConfig,
  [CONNECTOR_TYPES.AWS_DYNAMODB]: validateAwsDynamoDbConnectorConfig,

  // GCP
  [CONNECTOR_TYPES.GCP_STORAGE]: validateGcpStorageConnectorConfig,
  [CONNECTOR_TYPES.GCP_PUBSUB]: validateGcpPubSubConnectorConfig,
  [CONNECTOR_TYPES.GCP_FIRESTORE]: validateGcpFirestoreConnectorConfig,

  // Messengers
  [CONNECTOR_TYPES.SLACK]: validateSlackConnectorConfig,
  [CONNECTOR_TYPES.TELEGRAM]: validateTelegramConnectorConfig,
  [CONNECTOR_TYPES.DISCORD]: validateDiscordConnectorConfig,

  // CRM
  [CONNECTOR_TYPES.HUBSPOT]: validateHubSpotConnectorConfig,

  // Productivity
  [CONNECTOR_TYPES.GOOGLE_SHEETS]: validateGoogleSheetsConnectorConfig,
  [CONNECTOR_TYPES.NOTION]: validateNotionConnectorConfig,
  [CONNECTOR_TYPES.AIRTABLE]: validateAirtableConnectorConfig,
  [CONNECTOR_TYPES.TRELLO]: validateTrelloConnectorConfig,
  [CONNECTOR_TYPES.GITHUB]: validateGitHubConnectorConfig,
  [CONNECTOR_TYPES.MAILCHIMP]: validateMailchimpConnectorConfig,
  [CONNECTOR_TYPES.CONVERTKIT]: validateConvertKitConnectorConfig,
};

export function registerConnectorValidator(connectorType: string, validator: ConnectorValidator): void {
  validatorRegistry[connectorType.toUpperCase()] = validator;
}

export async function validateConnectorConfiguration(
  connectorType: string | undefined,
  connectorConfiguration: string | undefined,
): Promise<OpResult> {
  if (!connectorType || connectorType.trim() === '') {
    return new OpResult();
  }

  if (!connectorConfiguration || connectorConfiguration.trim() === '') {
    return new OpResult();
  }

  const normalizedType = connectorType.toUpperCase().trim();
  const validator = validatorRegistry[normalizedType];

  if (!validator) {
    return new OpResult();
  }

  return validator(connectorConfiguration);
}

export const __testing = {
  validateSendGridConfig,
  validateSmtpConfig,
  validateAwsSesConfig,
  validateHttpConnectorConfig,
  validateSlackConnectorConfig,
  validateFtpConnectorConfig,
  validateAzureBlobConnectorConfig,
  validateAwsS3ConnectorConfig,
  validateGcpStorageConnectorConfig,
};
