// ./src/boundary/connectorInterfaces.ts
import { BaseCore } from '@sdflc/backend-helpers';
import { Readable } from 'stream';

export interface ConnectorFileItem {
  fileName: string;
  fieldName: string;
  mimeType: string;
  fileSize: number;
  fileUrl?: string;
}

export interface ConnectorMetadata {
  submissionId: string;
  requestId: string;
  formId: string;
  formName: string;
  submissionDateTime: string;
  remoteIp: string;
  userAgent: string;
  referrer: string;
}

export interface ConnectorSubmissionData {
  metadata: ConnectorMetadata;
  formData: any;
  files: Array<ConnectorFileItem>;
}

export interface ConnectorSendParams {
  connector: any;
  core: any; // Should extend any BaseCore
  form: any;
  formFields: any[];
  submissionData: ConnectorSubmissionData;
}

// =============================================================================
// HTTP Connector
// =============================================================================

export interface HttpHeader {
  name: string;
  value: string;
}

export interface HttpConnectorConfig {
  url: string;
  verb: string;
  headers: Array<HttpHeader>;
}

// =============================================================================
// Azure Storage Queue Connector
// =============================================================================

export interface AzureQueueConnectorConfig {
  /**
   * Azure Storage connection string.
   * Found in Azure Portal: Storage Account → Access keys → Connection string
   */
  connectionString: string;

  /**
   * Name of the queue to send messages to.
   * Queue must already exist in the storage account.
   */
  queueName: string;

  /**
   * Optional message time-to-live in seconds.
   * Default: 604800 (7 days, Azure's default)
   * Set to -1 for messages that never expire.
   */
  messageTtlSeconds?: number;
}

// =============================================================================
// Azure Blob Storage Connector
// =============================================================================

export interface AzureBlobConnectorConfig {
  /**
   * Azure Storage connection string.
   * Found in Azure Portal: Storage Account → Access keys → Connection string
   */
  connectionString: string;

  /**
   * Name of the blob container to store files in.
   * Container must already exist in the storage account.
   */
  containerName: string;

  /**
   * Optional path prefix for organizing blobs.
   * Example: "submissions/" or "forms/{{formName}}/"
   * Default: "" (root of container)
   */
  pathPrefix?: string;

  /**
   * Optional file naming pattern using placeholders.
   * Available placeholders:
   * - {{requestId}} - Submission request ID (e.g., 20250530143022-ABCD)
   * - {{formId}} - Form UUID
   * - {{formName}} - Form name (sanitized, spaces replaced with hyphens)
   * - {{timestamp}} - Unix timestamp in milliseconds
   * - {{date}} - Date in YYYY-MM-DD format
   * Default: "{{requestId}}.json"
   */
  fileNamePattern?: string;
}

/**
 * Parameters for uploading a file to Azure Blob Storage
 */
export interface AzureBlobUploadFileParams {
  /** Local file path to upload */
  filePath?: string;

  /** Readable stream to upload (alternative to filePath) */
  stream?: Readable;

  /** Content length in bytes (required when using stream) */
  contentLength?: number;

  /** Target file name (without path - path is built from pathPrefix config and metadata) */
  fileName: string;

  /** MIME type of the file */
  mimeType?: string;

  /** Original file name (for Content-Disposition header) */
  originalFileName?: string;

  /** Metadata for resolving path prefix placeholders and file name prefix */
  metadata: {
    /** Submission request ID - used to prefix the file name */
    requestId: string;
    /** Form UUID - available as {{formId}} placeholder */
    formId: string;
    /** Form name - available as {{formName}} placeholder (will be sanitized) */
    formName: string;
  };
}

// =============================================================================
// Azure Table Storage Connector
// =============================================================================

export interface AzureTableConnectorConfig {
  /**
   * Azure Storage connection string.
   * Found in Azure Portal: Storage Account → Access keys → Connection string
   */
  connectionString: string;

  /**
   * Name of the table to store data in.
   * Table will be auto-created if it doesn't exist.
   */
  tableName: string;

  /**
   * Pattern for partition key using placeholders.
   * Partition key groups related entities for efficient querying.
   * Available placeholders:
   * - {{requestId}} - Submission request ID
   * - {{formId}} - Form UUID
   * - {{formName}} - Form name (sanitized)
   * - {{date}} - Date in YYYY-MM-DD format
   * Default: "{{formId}}"
   */
  partitionKey?: string;

  /**
   * Pattern for row key using placeholders.
   * Row key must be unique within a partition.
   * Available placeholders:
   * - {{requestId}} - Submission request ID
   * - {{formId}} - Form UUID
   * - {{formName}} - Form name (sanitized)
   * - {{timestamp}} - Unix timestamp in milliseconds
   * - {{date}} - Date in YYYY-MM-DD format
   * Default: "{{requestId}}"
   */
  rowKey?: string;
}

// =============================================================================
// Azure Service Bus Connector
// =============================================================================

export interface AzureServiceBusConnectorConfig {
  /**
   * Azure Service Bus connection string.
   * Found in Azure Portal: Service Bus Namespace → Shared access policies → Connection string
   */
  connectionString: string;

  /**
   * Name of the queue to send messages to.
   * Use either queueName OR topicName, not both.
   */
  queueName?: string;

  /**
   * Name of the topic to send messages to.
   * Use either queueName OR topicName, not both.
   */
  topicName?: string;

  /**
   * Optional message subject for filtering in topic subscriptions.
   * Supports placeholders: {{requestId}}, {{formId}}, {{formName}}, {{date}}, {{randUuid}}
   */
  messageSubject?: string;

  /**
   * Optional custom label/tag for the message.
   * Supports placeholders: {{requestId}}, {{formId}}, {{formName}}, {{date}}, {{randUuid}}
   */
  messageLabel?: string;
}

// =============================================================================
// Azure Event Grid Connector
// =============================================================================

export interface AzureEventGridConnectorConfig {
  /**
   * Azure Event Grid topic endpoint URL.
   * Found in Azure Portal: Event Grid Topic → Overview → Topic Endpoint
   */
  topicEndpoint: string;

  /**
   * Access key for the Event Grid topic.
   * Found in Azure Portal: Event Grid Topic → Access keys → Key 1 or Key 2
   */
  accessKey: string;

  /**
   * Event type for filtering in subscriptions.
   * Default: "FormSubmission"
   */
  eventType?: string;

  /**
   * Event subject pattern using placeholders.
   * Used for filtering events in subscriptions.
   * Available placeholders: {{requestId}}, {{formId}}, {{formName}}, {{date}}, {{randUuid}}
   * Default: "/forms/{{formId}}/submissions/{{requestId}}"
   */
  subject?: string;

  /**
   * Data version for the event schema.
   * Default: "1.0"
   */
  dataVersion?: string;
}

// =============================================================================
// AWS Common Authentication
// =============================================================================

/**
 * Common AWS authentication fields used by all AWS connectors
 */
export interface AwsAuthConfig {
  /**
   * AWS Access Key ID.
   * Found in AWS Console: IAM → Users → Security credentials → Access keys
   */
  accessKeyId: string;

  /**
   * AWS Secret Access Key.
   * Shown only once when creating the access key.
   */
  secretAccessKey: string;

  /**
   * AWS Region (e.g., us-east-1, eu-west-1).
   */
  region: string;
}

// =============================================================================
// AWS S3 Connector
// =============================================================================

export interface AwsS3ConnectorConfig extends AwsAuthConfig {
  /**
   * S3 bucket name.
   * Bucket must already exist.
   */
  bucketName: string;

  /**
   * Optional path prefix for organizing objects.
   * Example: "submissions/" or "forms/{{formName}}/"
   * Default: "" (root of bucket)
   */
  pathPrefix?: string;

  /**
   * Optional file naming pattern using placeholders.
   * Available placeholders:
   * - {{requestId}} - Submission request ID
   * - {{formId}} - Form UUID
   * - {{formName}} - Form name (sanitized)
   * - {{timestamp}} - Unix timestamp in milliseconds
   * - {{date}} - Date in YYYY-MM-DD format
   * - {{randUuid}} - Random UUID v4
   * Default: "{{requestId}}.json"
   */
  fileNamePattern?: string;
}

// =============================================================================
// AWS SQS Connector
// =============================================================================

export interface AwsSqsConnectorConfig extends AwsAuthConfig {
  /**
   * SQS Queue URL.
   * Found in AWS Console: SQS → Queue → URL
   */
  queueUrl: string;

  /**
   * Optional message group ID (required for FIFO queues).
   * Supports placeholders: {{formId}}, {{formName}}
   */
  messageGroupId?: string;

  /**
   * Optional message deduplication ID (for FIFO queues without content-based deduplication).
   * Supports placeholders: {{requestId}}, {{randUuid}}
   * Default for FIFO: {{requestId}}
   */
  messageDeduplicationId?: string;

  /**
   * Optional delay in seconds before message becomes visible (0-900).
   * Default: 0
   */
  delaySeconds?: number;
}

// =============================================================================
// AWS SNS Connector
// =============================================================================

export interface AwsSnsConnectorConfig extends AwsAuthConfig {
  /**
   * SNS Topic ARN.
   * Found in AWS Console: SNS → Topics → ARN
   */
  topicArn: string;

  /**
   * Optional message subject (used for email subscriptions).
   * Supports placeholders: {{requestId}}, {{formId}}, {{formName}}, {{date}}
   */
  messageSubject?: string;

  /**
   * Optional message group ID (required for FIFO topics).
   * Supports placeholders: {{formId}}, {{formName}}
   */
  messageGroupId?: string;

  /**
   * Optional message deduplication ID (for FIFO topics).
   * Supports placeholders: {{requestId}}, {{randUuid}}
   */
  messageDeduplicationId?: string;
}

// =============================================================================
// AWS EventBridge Connector
// =============================================================================

export interface AwsEventBridgeConnectorConfig extends AwsAuthConfig {
  /**
   * EventBridge event bus name or ARN.
   * Use "default" for the default event bus, or specify custom bus name/ARN.
   * Default: "default"
   */
  eventBusName?: string;

  /**
   * Event source identifier.
   * Typically your application name.
   * Default: "formsubmits"
   */
  source?: string;

  /**
   * Detail type for the event (like event type/name).
   * Used for event filtering in rules.
   * Default: "FormSubmission"
   */
  detailType?: string;
}

// =============================================================================
// AWS DynamoDB Connector
// =============================================================================

export interface AwsDynamoDbConnectorConfig extends AwsAuthConfig {
  /**
   * DynamoDB table name.
   * Table must already exist with the specified key schema.
   */
  tableName: string;

  /**
   * Partition key attribute name and value pattern.
   * Value supports placeholders: {{requestId}}, {{formId}}, {{formName}}, {{date}}, {{randUuid}}
   * Default: { name: "pk", value: "{{formId}}" }
   */
  partitionKey?: {
    name: string;
    value: string;
  };

  /**
   * Optional sort key attribute name and value pattern.
   * Value supports placeholders: {{requestId}}, {{formId}}, {{formName}}, {{timestamp}}, {{date}}, {{randUuid}}
   * Default: { name: "sk", value: "{{requestId}}" }
   */
  sortKey?: {
    name: string;
    value: string;
  };

  /**
   * Optional TTL attribute name if table has TTL enabled.
   * Value will be set to current time + ttlDays.
   */
  ttlAttribute?: string;

  /**
   * Number of days until item expires (if ttlAttribute is set).
   * Default: 365
   */
  ttlDays?: number;
}

// =============================================================================
// GCP Common Authentication
// =============================================================================

export interface GcpAuthConfig {
  projectId: string;
  credentials: string; // Service Account JSON key content
}

// =============================================================================
// GCP Cloud Storage Connector
// =============================================================================

export interface GcpStorageConnectorConfig extends GcpAuthConfig {
  bucketName: string;
  pathPrefix?: string;
  fileNamePattern?: string;
}

// =============================================================================
// GCP Pub/Sub Connector
// =============================================================================

export interface GcpPubSubConnectorConfig extends GcpAuthConfig {
  topicName: string;
  orderingKey?: string;
}

// =============================================================================
// GCP Firestore Connector
// =============================================================================

export interface GcpFirestoreConnectorConfig extends GcpAuthConfig {
  databaseId?: string; // defaults to "(default)"
  collection: string;
  documentIdPattern?: string;
  ttlField?: string;
  ttlDays?: number;
}

// =============================================================================
// Slack Connector
// =============================================================================

export interface SlackConnectorConfig {
  /**
   * Slack Incoming Webhook URL.
   * Created in Slack App → Incoming Webhooks → Add New Webhook to Workspace
   */
  webhookUrl: string;

  /**
   * Show submission metadata (ID, timestamp).
   * Default: true
   */
  showMetadata?: boolean;

  /**
   * Show attached files list.
   * Default: true
   */
  showFiles?: boolean;

  /**
   * Show "View Submission" button linking to FormSubmits dashboard.
   * Default: true
   */
  showViewButton?: boolean;

  /**
   * Custom header pattern using placeholders.
   * Available placeholders: {{formName}}, {{formId}}, {{requestId}}, {{date}}
   * Default: "📬 New submission: {{formName}}"
   */
  headerPattern?: string;
}

// =============================================================================
// Telegram Connector (add to ./src/boundary/connectorInterfaces.ts)
// =============================================================================

export interface TelegramConnectorConfig {
  /**
   * Telegram Bot API token.
   * Obtained from @BotFather when creating a bot.
   */
  botToken: string;

  /**
   * Chat ID where messages will be sent.
   * Can be a user ID, group ID (negative number), or @channelusername.
   */
  chatId: string;

  /**
   * Show submission metadata (ID, timestamp).
   * Default: true
   */
  showMetadata?: boolean;

  /**
   * Show attached files list.
   * Default: true
   */
  showFiles?: boolean;

  /**
   * Show "View Submission" inline button linking to FormSubmits dashboard.
   * Default: true
   */
  showViewButton?: boolean;

  /**
   * Custom header pattern using placeholders.
   * Available placeholders: {{formName}}, {{formId}}, {{requestId}}, {{date}}
   * Default: "📬 New submission: {{formName}}"
   */
  headerPattern?: string;
}

// =============================================================================
// Discord Connector (add to ./src/boundary/connectorInterfaces.ts)
// =============================================================================

export interface DiscordConnectorConfig {
  /**
   * Discord Webhook URL.
   * Created in Server Settings → Integrations → Webhooks → New Webhook
   */
  webhookUrl: string;

  /**
   * Show submission metadata (ID, timestamp).
   * Default: true
   */
  showMetadata?: boolean;

  /**
   * Show attached files list.
   * Default: true
   */
  showFiles?: boolean;

  /**
   * Show "View Submission" link in the embed.
   * Default: true
   */
  showViewButton?: boolean;

  /**
   * Custom header pattern using placeholders.
   * Available placeholders: {{formName}}, {{formId}}, {{requestId}}, {{date}}
   * Default: "📬 New submission: {{formName}}"
   */
  headerPattern?: string;
}

// =============================================================================
// HubSpot Connector (add to ./src/boundary/connectorInterfaces.ts)
// =============================================================================

export interface HubSpotConnectorConfig {
  /**
   * HubSpot Private App access token.
   * Created in HubSpot Settings → Integrations → Private Apps
   * Required scopes: crm.objects.contacts.read, crm.objects.contacts.write,
   *                  tickets, crm.objects.owners.read
   */
  accessToken: string;

  /**
   * Ticket pipeline ID.
   * If not specified, uses the default "Support Pipeline" (0).
   * Find pipeline IDs in HubSpot Settings → Objects → Tickets → Pipelines
   */
  pipelineId?: string;

  /**
   * Initial ticket stage ID.
   * If not specified, uses the first stage in the pipeline.
   */
  stageId?: string;

  /**
   * Ticket priority: LOW, MEDIUM, or HIGH.
   * Default: MEDIUM
   */
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  /**
   * Custom ticket subject pattern using placeholders.
   * Available placeholders: {{formName}}, {{formId}}, {{requestId}}, {{date}}
   * Default: "{{formName}}: New submission"
   */
  subjectPattern?: string;

  /**
   * Update existing contact if found by email/phone.
   * Default: true
   */
  updateExistingContact?: boolean;
}

// =============================================================================
// Google Sheets Connector (add to ./src/boundary/connectorInterfaces.ts)
// =============================================================================

export interface GoogleSheetsConnectorConfig {
  /**
   * Google Cloud Service Account credentials JSON.
   * Optional - if not provided, uses FormSubmits shared service account.
   * When using shared account, user must share their sheet with the FormSubmits service email.
   */
  credentials?: string;

  /**
   * Google Spreadsheet ID.
   * Found in the sheet URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   */
  spreadsheetId: string;

  /**
   * Sheet/tab name to append data to.
   * Default: "Sheet1"
   */
  sheetName?: string;

  /**
   * Include metadata columns (Timestamp, Submission ID).
   * Default: true
   */
  includeMetadata?: boolean;

  /**
   * Auto-create header row if the sheet is empty.
   * Default: true
   */
  includeHeaders?: boolean;
}

// =============================================================================
// Notion Connector (add to ./src/boundary/connectorInterfaces.ts)
// =============================================================================

export interface NotionConnectorConfig {
  /**
   * Notion Internal Integration token.
   * Created at https://www.notion.so/my-integrations
   */
  integrationToken: string;

  /**
   * Notion Database ID.
   * Found in the database URL: https://www.notion.so/{workspace}/{DATABASE_ID}?v=...
   * or https://www.notion.so/{DATABASE_ID}?v=...
   */
  databaseId: string;

  /**
   * Include metadata properties (Timestamp, Submission ID).
   * These properties must exist in the database if enabled.
   * Default: true
   */
  includeMetadata?: boolean;

  /**
   * Property name to use as the page title.
   * If not specified, uses the first "title" type property in the database.
   * Default: "Name"
   */
  titleProperty?: string;
}

// =============================================================================
// Airtable Connector (add to ./src/boundary/connectorInterfaces.ts)
// =============================================================================

export interface AirtableConnectorConfig {
  /**
   * Airtable Personal Access Token.
   * Created at https://airtable.com/create/tokens
   */
  accessToken: string;

  /**
   * Airtable Base ID.
   * Found in the base URL: https://airtable.com/{BASE_ID}/...
   * Starts with "app"
   */
  baseId: string;

  /**
   * Table name or ID.
   * Can use the table name (e.g., "Submissions") or table ID (starts with "tbl")
   */
  tableName: string;

  /**
   * Include metadata fields (Timestamp, Submission ID).
   * These fields must exist in the table if enabled.
   * Default: true
   */
  includeMetadata?: boolean;
}

// =============================================================================
// Trello Connector (add to ./src/boundary/connectorInterfaces.ts)
// =============================================================================

export interface TrelloConnectorConfig {
  /**
   * Trello API Key.
   * Get from https://trello.com/power-ups/admin (API Key section)
   */
  apiKey: string;

  /**
   * Trello API Token.
   * Generated via authorization URL with your API key.
   */
  apiToken: string;

  /**
   * Trello List ID where cards will be created.
   * Found in list URL or via API.
   */
  listId: string;

  /**
   * Card name/title pattern.
   * Available placeholders: {{formName}}, {{formId}}, {{requestId}}, {{date}}
   * Default: "{{formName}}: New submission"
   */
  namePattern?: string;

  /**
   * Include metadata in card description (Timestamp, Submission ID, View URL).
   * Default: true
   */
  includeMetadata?: boolean;
}

// =============================================================================
// GitHub Connector (add to ./src/boundary/connectorInterfaces.ts)
// =============================================================================

export interface GitHubConnectorConfig {
  /**
   * GitHub Personal Access Token.
   * Classic token or fine-grained token with Issues write permission.
   */
  accessToken: string;

  /**
   * Repository owner (username or organization).
   */
  owner: string;

  /**
   * Repository name.
   */
  repo: string;

  /**
   * Issue title pattern.
   * Available placeholders: {{formName}}, {{formId}}, {{requestId}}, {{date}}
   * Default: "{{formName}}: New submission"
   */
  titlePattern?: string;

  /**
   * Labels to add to the issue (comma-separated).
   * Example: "form-submission,needs-review"
   */
  labels?: string;

  /**
   * Include metadata in issue body (Timestamp, Submission ID, View URL).
   * Default: true
   */
  includeMetadata?: boolean;
}

// =============================================================================
// Mailchimp Connector (add to ./src/boundary/connectorInterfaces.ts)
// =============================================================================

export interface MailchimpConnectorConfig {
  /**
   * Mailchimp API Key.
   * Format: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-usXX
   * The suffix (e.g., us21) indicates the data center.
   */
  apiKey: string;

  /**
   * Audience/List ID where subscribers will be added.
   * Found in Audience → Settings → Audience name and defaults.
   */
  audienceId: string;

  /**
   * How to handle existing subscribers.
   * - "update": Update existing subscriber's info
   * - "skip": Skip if already subscribed
   * Default: "update"
   */
  existingSubscriberAction?: 'update' | 'skip';

  /**
   * Subscriber status for new subscribers.
   * - "subscribed": Immediately subscribed (use if you have consent)
   * - "pending": Sends confirmation email (double opt-in)
   * Default: "subscribed"
   */
  status?: 'subscribed' | 'pending';

  /**
   * Enable merge field auto-mapping.
   * Maps form fields to Mailchimp merge fields by name (FNAME, LNAME, PHONE, etc.)
   * Default: true
   */
  autoMapFields?: boolean;
}

// =============================================================================
// ConvertKit Connector (add to ./src/boundary/connectorInterfaces.ts)
// =============================================================================

export interface ConvertKitConnectorConfig {
  /**
   * ConvertKit API Secret.
   * Found in Settings → Advanced → API Secret
   */
  apiSecret: string;

  /**
   * ConvertKit Form ID to subscribe to.
   * Found in form settings or URL when editing a form.
   */
  formId: string;

  /**
   * Optional Tag ID to add to the subscriber.
   * Found in tag URL or via API.
   */
  tagId?: string;

  /**
   * Enable field auto-mapping.
   * Maps form fields to ConvertKit fields (first_name, etc.)
   * Default: true
   */
  autoMapFields?: boolean;
}

// =============================================================================
// FTP/FTPS Connector
// =============================================================================

export interface FtpConnectorConfig {
  /**
   * FTP server hostname or IP address.
   */
  host: string;

  /**
   * FTP server port.
   * Default: 21
   */
  port?: number;

  /**
   * FTP username.
   */
  username: string;

  /**
   * FTP password.
   */
  password: string;

  /**
   * Use secure connection (FTPS).
   * Default: false (FTP), true (FTPS)
   */
  secure?: boolean;

  /**
   * Optional path prefix (remote directory). Supports placeholders.
   * Available placeholders:
   * - {{formId}} - Form UUID
   * - {{formName}} - Form name (sanitized)
   * - {{date}} - Date in YYYY-MM-DD format
   * - {{year}}, {{month}}, {{day}} - Individual date parts
   * Example: "/uploads/{{formName}}/{{date}}/"
   * Default: "/" (root)
   */
  pathPrefix?: string;

  /**
   * Optional file naming pattern for submission data JSON files.
   * Additional placeholders:
   * - {{requestId}} - Submission request ID
   * - {{timestamp}} - Unix timestamp in milliseconds
   * Default: "{{requestId}}.json"
   */
  fileNamePattern?: string;

  /**
   * Whether to verify the server's TLS certificate (FTPS only).
   * Default: true
   */
  rejectUnauthorized?: boolean;

  /**
   * Implicit FTPS mode (port 990) vs explicit FTPS (port 21 with STARTTLS).
   * Default: false (explicit mode)
   */
  secureImplicit?: boolean;
}

/**
 * Parameters for uploading a file via FTP/FTPS
 */
export interface FtpUploadFileParams {
  /** Local file path to upload */
  filePath: string;

  /** Target file name (without path - path is built from pathPrefix config and metadata) */
  fileName: string;

  /** Original file name (for logging) */
  originalFileName?: string;

  /** Metadata for resolving path prefix placeholders and file name prefix */
  metadata: {
    /** Submission request ID - used to prefix the file name */
    requestId: string;
    /** Form UUID - available as {{formId}} placeholder */
    formId: string;
    /** Form name - available as {{formName}} placeholder (will be sanitized) */
    formName: string;
  };
}

// =============================================================================
// Email Common Types
// =============================================================================

/**
 * Email recipient with optional personalization variables
 */
export interface EmailRecipient {
  /** Recipient email address */
  email: string;

  /** Recipient display name */
  name?: string;

  /** Per-recipient personalization variables (e.g., { recipientName: "John" }) */
  vars?: Record<string, string>;
}

/**
 * Parameters for sending emails via email connectors (SendGrid, SMTP)
 */
export interface EmailSendParams {
  /** List of recipients with optional per-recipient vars */
  recipients: EmailRecipient[];

  /** Email subject - supports {{varName}} placeholders */
  subject: string;

  /** HTML email body - supports {{varName}} placeholders */
  htmlBody: string;

  /** Plain text email body - supports {{varName}} placeholders */
  textBody?: string;

  /** Common variables replaced for ALL recipients before personalization */
  commonVars?: Record<string, string>;

  /** Reply-to email address */
  replyTo?: string;

  /** Reply-to display name */
  replyToName?: string;
}

// =============================================================================
// SendGrid Connector
// =============================================================================

/**
 * SendGrid connector config as stored in database.
 * Uses fromAccountEmailId reference to verified account email.
 */
export interface SendGridConnectorConfig {
  /**
   * SendGrid API Key.
   * Created at https://app.sendgrid.com/settings/api_keys
   */
  apiKey: string;

  /**
   * Reference to account_emails table for verified sender email.
   * The email must be confirmed before it can be used.
   */
  fromAccountEmailId: string;

  /**
   * SendGrid categories for email classification and analytics.
   * Up to 10 categories per email.
   */
  categories?: string[];

  /**
   * Custom arguments (unique_args) passed through SendGrid webhooks.
   * Key-value pairs attached to the email for tracking.
   * Values support placeholders: {{varName}}
   */
  customArgs?: Record<string, string>;

  /**
   * Enable sandbox mode for testing (emails won't actually be sent).
   * Default: false
   */
  sandboxMode?: boolean;
}

/**
 * SendGrid runtime config used by gateway class.
 * Contains resolved fromEmail/fromName from account email.
 */
export interface SendGridRuntimeConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  categories?: string[];
  customArgs?: Record<string, string>;
  sandboxMode?: boolean;
}

// =============================================================================
// SMTP Connector
// =============================================================================

/**
 * SMTP connector config as stored in database.
 * Uses fromAccountEmailId reference to verified account email.
 */
export interface SmtpConnectorConfig {
  /**
   * SMTP server hostname.
   */
  host: string;

  /**
   * SMTP server port.
   * Common ports: 25 (unencrypted), 465 (SSL/TLS), 587 (STARTTLS)
   * Default: 587
   */
  port?: number;

  /**
   * Use secure connection.
   * - true: Use TLS/SSL (typically port 465)
   * - false: Use STARTTLS upgrade (typically port 587)
   * Default: false (STARTTLS)
   */
  secure?: boolean;

  /**
   * SMTP username for authentication.
   */
  username: string;

  /**
   * SMTP password for authentication.
   */
  password: string;

  /**
   * Reference to account_emails table for verified sender email.
   * The email must be confirmed before it can be used.
   */
  fromAccountEmailId: string;

  /**
   * Custom email headers (X- headers).
   * Values support placeholders: {{varName}}
   * Example: { "X-Form-ID": "{{formId}}", "X-Campaign": "signup" }
   */
  customHeaders?: Record<string, string>;

  /**
   * Reject connections with invalid TLS certificates.
   * Set to false for self-signed certificates.
   * Default: true
   */
  rejectUnauthorized?: boolean;
}

/**
 * SMTP runtime config used by gateway class.
 * Contains resolved fromEmail/fromName from account email.
 */
export interface SmtpRuntimeConfig {
  host: string;
  port?: number;
  secure?: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName?: string;
  customHeaders?: Record<string, string>;
  rejectUnauthorized?: boolean;
}

// =============================================================================
// AWS SES Connector
// =============================================================================

/**
 * AWS SES connector config as stored in database.
 * Uses fromAccountEmailId reference to verified account email.
 */
export interface AwsSesConnectorConfig extends AwsAuthConfig {
  /**
   * Reference to account_emails table for verified sender email.
   * The email must be confirmed before it can be used.
   */
  fromAccountEmailId: string;

  /**
   * Optional SES Configuration Set name for tracking opens, clicks, bounces.
   * Created in AWS Console: SES → Configuration sets
   */
  configurationSetName?: string;

  /**
   * Optional message tags for categorization and filtering.
   * Key-value pairs attached to the email for analytics.
   * Values support placeholders: {{varName}}
   */
  messageTags?: Record<string, string>;
}

/**
 * AWS SES runtime config used by gateway class.
 * Contains resolved fromEmail/fromName from account email.
 */
export interface AwsSesRuntimeConfig extends AwsAuthConfig {
  fromEmail: string;
  fromName?: string;
  configurationSetName?: string;
  messageTags?: Record<string, string>;
}
