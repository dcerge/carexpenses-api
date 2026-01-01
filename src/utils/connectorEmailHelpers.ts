// ./src/utils/connectorEmailHelpers.ts
import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { logger } from '../logger';
import config from '../config';
import {
  CONNECTOR_TYPES,
  SendGridConnectorConfig,
  SendGridRuntimeConfig,
  SmtpConnectorConfig,
  SmtpRuntimeConfig,
  EmailSendParams,
  EmailRecipient,
  AwsSesConnectorConfig,
  AwsSesRuntimeConfig,
} from '../boundary';
import { ConnectorAwsSesGw, ConnectorSendGridGw, ConnectorSmtpGw } from '../gateways';
import { parseOptions } from './parserHelpers';
import { formatFileSize } from './filesHelpers';
import { decryptConnectorConfig } from './connectorMisc';

dayjs.extend(utc);

// =============================================================================
// Interfaces
// =============================================================================

/**
 * Resolved account email for sender address.
 * Must be fetched from account_emails table and validated as confirmed.
 */
export interface ResolvedAccountEmail {
  /** Account email record ID */
  id: string;

  /** Verified email address */
  email: string;

  /** Display name (optional) */
  name?: string;
}

export interface SendEmailWithConnectorParams {
  /** Connector record from database */
  connector: any;

  /** Resolved and verified sender account email */
  fromAccountEmail: ResolvedAccountEmail;

  /** List of recipients */
  recipients: EmailRecipient[];

  /** Email subject (supports {{varName}} placeholders) */
  subject: string;

  /** HTML email body (supports {{varName}} placeholders) */
  htmlBody: string;

  /** Plain text email body (supports {{varName}} placeholders) */
  textBody?: string;

  /** Common variables replaced for all recipients */
  commonVars?: Record<string, string>;

  /** Reply-to email address */
  replyTo?: string;

  /** Reply-to display name */
  replyToName?: string;
}

export interface AssembleEmailParams {
  /** Email template record */
  template: any;

  /** Email layout record (optional) */
  layout?: any;

  /** Variables to replace in subject and body */
  variables: Record<string, string>;
}

export interface AssembleEmailResult {
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface BuildSubmissionVariablesParams {
  /** Form record */
  form: any;

  /** Submission record */
  submission: any;

  /** Form data (field values) */
  formData: Record<string, any>;

  /** Form fields configuration */
  formFields: any[];

  /** Uploaded files info */
  uploadedFiles?: any[];

  /** Reply-to email if available */
  replyTo?: string;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Send email using a configured email connector (SendGrid, SMTP, or AWS SES).
 *
 * The sender email is resolved from a verified account email record,
 * ensuring only confirmed emails can be used as the "from" address.
 */
export const sendEmailWithConnector = async (params: SendEmailWithConnectorParams): Promise<OpResult> => {
  const { connector, fromAccountEmail, recipients, subject, htmlBody, textBody, commonVars, replyTo, replyToName } =
    params;

  if (!connector) {
    return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Email connector is required');
  }

  if (!fromAccountEmail) {
    return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Sender account email is required');
  }

  if (!fromAccountEmail.email) {
    return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Sender account email address is missing');
  }

  if (!recipients || recipients.length === 0) {
    return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'At least one recipient is required');
  }

  const emailParams: EmailSendParams = {
    recipients,
    subject,
    htmlBody,
    textBody,
    commonVars,
    replyTo,
    replyToName,
  };

  const connectorConfig = decryptConnectorConfig(connector);

  // Use the resolved account email for fromEmail/fromName
  const fromEmail = fromAccountEmail.email;
  const fromName = fromAccountEmail.name;

  switch (connector.connectorType) {
    case CONNECTOR_TYPES.SENDGRID: {
      const sendGridGw = new ConnectorSendGridGw();
      const storedConfig = parseOptions<SendGridConnectorConfig>(connectorConfig, {
        apiKey: '',
        fromAccountEmailId: '',
        categories: [],
        customArgs: {},
        sandboxMode: false,
      });

      // Build runtime config with resolved account email
      const runtimeConfig: SendGridRuntimeConfig = {
        apiKey: storedConfig.apiKey,
        fromEmail,
        fromName,
        categories: storedConfig.categories,
        customArgs: storedConfig.customArgs,
        sandboxMode: storedConfig.sandboxMode,
      };

      sendGridGw.configure(runtimeConfig);

      return await sendGridGw.sendEmail(emailParams);
    }

    case CONNECTOR_TYPES.SMTP: {
      const smtpGw = new ConnectorSmtpGw();
      const storedConfig = parseOptions<SmtpConnectorConfig>(connectorConfig, {
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '',
        fromAccountEmailId: '',
        customHeaders: {},
        rejectUnauthorized: true,
      });

      // Build runtime config with resolved account email
      const runtimeConfig: SmtpRuntimeConfig = {
        host: storedConfig.host,
        port: storedConfig.port,
        secure: storedConfig.secure,
        username: storedConfig.username,
        password: storedConfig.password,
        fromEmail,
        fromName,
        customHeaders: storedConfig.customHeaders,
        rejectUnauthorized: storedConfig.rejectUnauthorized,
      };

      smtpGw.configure(runtimeConfig);

      return await smtpGw.sendEmail(emailParams);
    }

    case CONNECTOR_TYPES.AWS_SES: {
      const awsSesGw = new ConnectorAwsSesGw();
      const storedConfig = parseOptions<AwsSesConnectorConfig>(connectorConfig, {
        accessKeyId: '',
        secretAccessKey: '',
        region: '',
        fromAccountEmailId: '',
        configurationSetName: '',
        messageTags: {},
      });

      // Build runtime config with resolved account email
      const runtimeConfig: AwsSesRuntimeConfig = {
        accessKeyId: storedConfig.accessKeyId,
        secretAccessKey: storedConfig.secretAccessKey,
        region: storedConfig.region,
        fromEmail,
        fromName,
        configurationSetName: storedConfig.configurationSetName,
        messageTags: storedConfig.messageTags,
      };

      awsSesGw.configure(runtimeConfig);

      return await awsSesGw.sendEmail(emailParams);
    }

    default:
      return OpResult.fail(
        OP_RESULT_CODES.VALIDATION_FAILED,
        {},
        `Connector type '${connector.connectorType}' is not a supported email connector`,
      );
  }
};

/**
 * Extract fromAccountEmailId from a decrypted email connector config.
 * Returns undefined if not found or connector is not an email type.
 */
export const getFromAccountEmailIdFromConnector = (connector: any): string | undefined => {
  if (!connector) {
    return undefined;
  }

  const connectorConfig = decryptConnectorConfig(connector);

  switch (connector.connectorType) {
    case CONNECTOR_TYPES.SENDGRID: {
      const parsed = parseOptions<SendGridConnectorConfig>(connectorConfig, {
        apiKey: '',
        fromAccountEmailId: '',
        categories: [],
        customArgs: {},
        sandboxMode: false,
      });
      return parsed.fromAccountEmailId || undefined;
    }

    case CONNECTOR_TYPES.SMTP: {
      const parsed = parseOptions<SmtpConnectorConfig>(connectorConfig, {
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '',
        fromAccountEmailId: '',
        customHeaders: {},
        rejectUnauthorized: true,
      });
      return parsed.fromAccountEmailId || undefined;
    }

    case CONNECTOR_TYPES.AWS_SES: {
      const parsed = parseOptions<AwsSesConnectorConfig>(connectorConfig, {
        accessKeyId: '',
        secretAccessKey: '',
        region: '',
        fromAccountEmailId: '',
        configurationSetName: '',
        messageTags: {},
      });
      return parsed.fromAccountEmailId || undefined;
    }

    default:
      return undefined;
  }
};

/**
 * Assemble final email content from template and optional layout.
 *
 * Layout's {{messageBody}} placeholder is replaced with template's htmlContent.
 * Variables are replaced in subject, htmlBody, and textBody.
 */
export const assembleEmailFromTemplate = (params: AssembleEmailParams): AssembleEmailResult => {
  const { template, layout, variables } = params;

  if (!template) {
    throw new Error('Email template is required');
  }

  // Start with template content
  let htmlBody = template.htmlContent || '';
  let textBody = template.textContent || '';
  let subject = template.subject || '';

  // If layout exists, wrap template content in layout
  if (layout) {
    const layoutHtml = layout.htmlContent || '{{messageBody}}';
    const layoutText = layout.textContent || '{{messageBody}}';

    // Replace {{messageBody}} in layout with template content
    htmlBody = layoutHtml.replace(/\{\{messageBody\}\}/g, htmlBody);
    textBody = layoutText.replace(/\{\{messageBody\}\}/g, textBody);
  }

  // Replace all variables in subject and body
  subject = replacePlaceholders(subject, variables);
  htmlBody = replacePlaceholders(htmlBody, variables);
  textBody = replacePlaceholders(textBody, variables);

  // Replace all variables in subject and body
  subject = replacePlaceholders(subject, variables);
  htmlBody = replacePlaceholders(htmlBody, variables);
  textBody = replacePlaceholders(textBody, variables);

  return {
    subject,
    htmlBody,
    textBody: textBody || undefined,
  };
};

/**
 * Build variables map from submission data for template replacement.
 *
 * Available variables:
 * - formName, formPath, formId
 * - requestId, submissionId, submissionDateTime, submissionDate, currentYear
 * - remoteIp, userAgent, referrer
 * - viewSubmissionLink
 * - submissionFieldsHtml, submissionFieldsText, submissionData
 * - Individual field values by field name (e.g., {{email}}, {{name}})
 */
export const buildSubmissionVariables = (params: BuildSubmissionVariablesParams): Record<string, string> => {
  const { form, submission, formData, formFields, uploadedFiles, replyTo } = params;

  // Build field lookup by name
  const fieldsByName: Record<string, any> = {};
  for (const field of formFields || []) {
    if (field.name) {
      fieldsByName[field.name] = field;
    }
  }

  // Format submission date time (matches legacy format)
  const submissionDttm = submission.submissionDttm || submission.submissionDateTime || new Date();
  const submissionDateTime = `${dayjs(submissionDttm).utc().format('MMMM DD, YYYY HH:mm')} UTC`;
  const submissionDate = dayjs(submissionDttm).utc().format('MMMM DD, YYYY');
  const currentYear = dayjs().utc().format('YYYY');

  // Build view submission link
  const viewSubmissionLink = submission.id ? `${config.webAppUrl}/submissions/${submission.id}/view` : '';

  // Build submission fields HTML and text (matches legacy buildSubmissionFieldsHtml)
  const submissionFieldsHtml = buildSubmissionFieldsHtml(formData, fieldsByName, uploadedFiles);
  const submissionFieldsText = buildSubmissionFieldsText(formData, fieldsByName, uploadedFiles);

  // Start with metadata variables (matching legacy variable names)
  const variables: Record<string, string> = {
    // Form info
    formName: form.name || '',
    formPath: form.path || '',
    formId: form.id || '',

    // Submission info (note: submissionId in legacy is actually requestId)
    requestId: submission.requestId || '',
    submissionId: submission.requestId || '', // Legacy uses requestId as submissionId
    submissionDateTime,
    submissionDate,
    currentYear,

    // Request info
    remoteIp: submission.remoteIp || 'N/A',
    userAgent: submission.userAgent || 'N/A',
    referrer: submission.referer || submission.referer || 'N/A',

    // Links
    viewSubmissionLink,

    // Rendered fields (support both naming conventions)
    submissionFieldsHtml,
    submissionFieldsText,
    submissionData: submissionFieldsHtml, // Alias for submissionFieldsHtml

    // Reply-to if available
    replyTo: replyTo || '',
  };

  // Add individual field values
  for (const fieldName in formData) {
    const value = formData[fieldName];
    const field = fieldsByName[fieldName];

    // Skip hidden fields
    if (field?.isHidden) {
      continue;
    }

    // Convert value to string
    let stringValue = '';
    if (value === null || value === undefined) {
      stringValue = '';
    } else if (Array.isArray(value)) {
      stringValue = value.join(', ');
    } else if (typeof value === 'boolean') {
      stringValue = value ? 'Yes' : 'No';
    } else {
      stringValue = String(value);
    }

    variables[fieldName] = stringValue;

    // Also add with field label as key (for convenience)
    if (field?.label && field.label !== fieldName) {
      variables[field.label] = stringValue;
    }
  }

  return variables;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Replace {{placeholder}} patterns in text with values from variables map.
 */
const replacePlaceholders = (text: string, variables: Record<string, string>): string => {
  if (!text || !variables) return text || '';

  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value ?? '');
  }

  return result;
};

/**
 * Escape HTML special characters to prevent XSS.
 */
const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Build HTML representation of submission fields for email templates.
 */
const buildSubmissionFieldsHtml = (
  formData: Record<string, any>,
  fieldsByName: Record<string, any>,
  uploadedFiles?: any[],
): string => {
  let html = '';

  // Iterate through form data
  for (const fieldName in formData) {
    const value = formData[fieldName];
    const field = fieldsByName[fieldName];
    const label = field?.label || fieldName;

    // Skip hidden fields
    if (field?.isHidden) {
      continue;
    }

    // Skip empty values
    if (value === null || value === undefined || value === '') {
      continue;
    }

    // Add field with label as subheader
    html += `<div style="margin-bottom: 20px;">`;
    html += `<strong style="font-size: 14px; color: #333; display: block; margin-bottom: 5px;">${escapeHtml(label)}</strong>`;

    // Handle different value types
    if (Array.isArray(value)) {
      html += `<div style="color: #555; font-size: 13px;">${value.map((v) => escapeHtml(String(v))).join(', ')}</div>`;
    } else if (typeof value === 'boolean') {
      html += `<div style="color: #555; font-size: 13px;">${value ? 'Yes' : 'No'}</div>`;
    } else {
      const stringValue = String(value);
      const lines = stringValue.split(/\r?\n/);

      const paragraphs: string[] = [];
      let currentParagraph: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === '') {
          if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph.join('<br>'));
            currentParagraph = [];
          }
        } else {
          currentParagraph.push(escapeHtml(trimmedLine));
        }
      }

      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join('<br>'));
      }

      if (paragraphs.length > 0) {
        html += `<div style="color: #555; font-size: 13px;">`;
        paragraphs.forEach((paragraph, index) => {
          const marginBottom = index < paragraphs.length - 1 ? 'margin-bottom: 10px;' : '';
          html += `<p style="${marginBottom} margin-top: 0;">${paragraph}</p>`;
        });
        html += `</div>`;
      }
    }

    html += `</div>`;
  }

  // Add uploaded files section
  if (uploadedFiles && uploadedFiles.length > 0) {
    html += `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">`;
    html += `<strong style="font-size: 14px; color: #333; display: block; margin-bottom: 10px;">Uploaded Files</strong>`;

    for (const file of uploadedFiles) {
      const fileSize = file.fileSize ? formatFileSize(file.fileSize) : '';
      const fileName = file.fileName || file.originalName || 'Unknown file';
      const fileUrl = file.fileUrl || '';

      html += `<div style="margin-bottom: 8px;">`;

      if (fileUrl) {
        // File with link
        html += `<a href="${escapeHtml(fileUrl)}" target="_blank" style="color: #667eea; font-size: 13px; text-decoration: none;">`;
        html += `📎 ${escapeHtml(fileName)}`;
        html += `</a>`;
      } else {
        // File without link
        html += `<span style="color: #667eea; font-size: 13px;">`;
        html += `📎 ${escapeHtml(fileName)}`;
        html += `</span>`;
      }

      if (fileSize) {
        html += `<span style="color: #999; font-size: 12px; margin-left: 8px;">(${fileSize})</span>`;
      }

      if (fileUrl) {
        html += `<br>`;
        html += `<a href="${escapeHtml(fileUrl)}" target="_blank" style="color: #999; font-size: 11px; text-decoration: underline; margin-left: 20px;">Download</a>`;
      }

      html += `</div>`;
    }

    html += `</div>`;
  }

  return html;
};

/**
 * Build plain text representation of submission fields for email templates.
 */
const buildSubmissionFieldsText = (
  formData: Record<string, any>,
  fieldsByName: Record<string, any>,
  uploadedFiles?: any[],
): string => {
  const lines: string[] = [];

  // Iterate through form data
  for (const fieldName in formData) {
    const value = formData[fieldName];
    const field = fieldsByName[fieldName];
    const label = field?.label || fieldName;

    // Skip hidden fields
    if (field?.isHidden) {
      continue;
    }

    // Skip empty values
    if (value === null || value === undefined || value === '') {
      continue;
    }

    // Format value
    let stringValue = '';
    if (Array.isArray(value)) {
      stringValue = value.join(', ');
    } else if (typeof value === 'boolean') {
      stringValue = value ? 'Yes' : 'No';
    } else {
      stringValue = String(value);
    }

    lines.push(`${label}: ${stringValue}`);
  }

  // Add uploaded files section
  if (uploadedFiles && uploadedFiles.length > 0) {
    lines.push('');
    lines.push('Uploaded Files:');

    for (const file of uploadedFiles) {
      const fileSize = file.fileSize ? formatFileSize(file.fileSize) : '';
      const fileName = file.fileName || file.originalName || 'Unknown file';
      const fileUrl = file.fileUrl || '';
      const sizeStr = fileSize ? ` (${fileSize})` : '';

      lines.push(`  - ${fileName}${sizeStr}`);

      if (fileUrl) {
        lines.push(`    ${fileUrl}`);
      }
    }
  }

  return lines.join('\n');
};
