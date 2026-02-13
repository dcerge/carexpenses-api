import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';
import { randomString } from '@sdflc/utils';

import { AppCore } from './AppCore';

import config from '../config';
import {
  FEATURE_CODES,
  RECEIPT_SCAN_SYSTEM_PROMPT,
  RECEIPT_SCAN_USER_PROMPT,
  ReceiptScanResult,
  getTempUploadPath,
  sanitizeFilename,
  validateFieldName,
  isExecutableFile,
  FileSecurityResult,
  isExecutableOrDangerousFile,
  sanitizeFieldName,
} from '../utils';
import { ClaudeMediaType } from '../gateways';

dayjs.extend(utc);

const ALLOWED_IMAGE_TYPES: Record<string, ClaudeMediaType> = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
};

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Core file for Scanning receipts
 */
class ScannerCore extends AppCore {

  private getHeaders() {
    const { req } = this.getContext();

    return {
      cookie: req.headers['cookie'],
    };
  }

  /**
   * The method receives an uploaded file and scans it using Claude Vision API
   */
  public async scanReceipt(args: any) {
    return this.runAction({
      args: args,
      doAuth: true,
      action: async (args, opt) => {
        const { req, res, requestId } = this.getContext();
        const utcNow = dayjs().utc();

        let tempFilePaths: string[] = [];
        let usageIncremented = false;

        try {
          /**
           * For now User submits structure like this:
           * {
           *   receipts: [file objects]
           * }
           * Important to note that at this time there should be just a single file
           */

          let result = await this.extractFormData({ req, res, requestId });

          if (result.didFail()) {
            return result;
          }

          // Get form fields and files:
          const extractedData = result.getDataFirst();

          const receiptFiles = extractedData.formFiles['receipts'];
          const currentTimeUtc = extractedData.formData['currentTimeUtc'];
          const currentTimeZoneOffset = extractedData.formData['currentTimeZoneOffset'];

          if (!receiptFiles || receiptFiles.length === 0) {
            return this.failure(OP_RESULT_CODES.VALIDATION_FAILED, `No receipt received to recognize`);
          }

          const receiptFile = receiptFiles[0];
          tempFilePaths.push(receiptFile.path);

          // --- Validate file type ---
          const mediaType = ALLOWED_IMAGE_TYPES[receiptFile.mimetype];

          if (!mediaType) {
            return this.failure(
              OP_RESULT_CODES.VALIDATION_FAILED,
              `Unsupported image type: ${receiptFile.mimetype}. Allowed types: JPEG, PNG, GIF, WebP.`
            );
          }

          // --- Validate file size ---
          if (receiptFile.size > MAX_IMAGE_SIZE_BYTES) {
            return this.failure(
              OP_RESULT_CODES.VALIDATION_FAILED,
              `Image file is too large (${(receiptFile.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 10MB.`
            );
          }

          // --- Validate file exists ---
          if (!fs.existsSync(receiptFile.path)) {
            return this.failure(
              OP_RESULT_CODES.FAILED,
              `Uploaded file not found on server. Please try again.`
            );
          }

          // --- Check feature usage limit before calling Claude API ---
          const usageResult = await this.getGateways().appFeatureUsageGw.increment({
            featureCode: FEATURE_CODES.MONTLY_RECEIPT_SCANS_QTY,
            incrementBy: 1,
            headers: this.getHeaders()
          });

          if (usageResult.code < 0) {
            this.logger.log(
              `Receipt scan blocked by usage limit: feature=${FEATURE_CODES.MONTLY_RECEIPT_SCANS_QTY}, ` +
              `error=${usageResult.getErrorSummary()}`
            );

            const errorMessage = usageResult.code === OP_RESULT_CODES.LIMIT_REACHED
              ? `You've reached your monthly receipt scan limit. Upgrade your plan for more scans.`
              : `Failed to verify scan usage. Please try again.`;

            return this.failure(usageResult.code, errorMessage);
          }

          usageIncremented = true;

          // Log remaining scans for monitoring
          const usageData = Array.isArray(usageResult.data) ? usageResult.data[0] : null;
          if (usageData) {
            this.logger.log(
              `Receipt scan usage: ${usageData.usageCount} of ${usageData.maxUsageCount} used ` +
              `(${usageData.remainingCount} remaining)`
            );
          }

          // --- Read file and convert to base64 ---
          const fileBuffer = fs.readFileSync(receiptFile.path);
          const base64Data = fileBuffer.toString('base64');

          // --- Configure Claude AI gateway ---
          this.getGateways().connectorClaudeAiGw.configure({
            apiKey: config.claudeAiApiKey,
            model: config.claudeAiModel,
            maxTokens: Number(config.claudeAiMaxTokens),
          });

          // --- Call Claude Vision API ---
          this.logger.log(`Scanning receipt image: ${receiptFile.originalname} (${mediaType}, ${receiptFile.size} bytes)`);

          const aiResult = await this.getGateways().connectorClaudeAiGw.analyzeImage({
            image: {
              type: 'base64',
              mediaType,
              data: base64Data,
            },
            prompt: RECEIPT_SCAN_USER_PROMPT,
            systemPrompt: RECEIPT_SCAN_SYSTEM_PROMPT,
            temperature: 0,
          });

          if (aiResult.didFail()) {
            this.logger.error(`Claude Vision API call failed: ${aiResult.getErrorSummary()}`);
            await this.rollBackUsage();
            usageIncremented = false;

            return this.failure(
              OP_RESULT_CODES.FAILED,
              `Failed to scan receipt. Please try again or enter data manually.`
            );
          }

          // --- Parse the JSON response ---
          const aiData = aiResult.getDataFirst();
          const rawText: string = aiData?.text || '';

          if (!rawText) {
            this.logger.error('Claude Vision API returned empty response');
            await this.rollBackUsage();
            usageIncremented = false;

            return this.failure(
              OP_RESULT_CODES.FAILED,
              `Receipt scan returned empty result. The image may be unreadable. Please try again with a clearer photo.`
            );
          }

          let scanResult: ReceiptScanResult;

          try {
            // Strip markdown fences if Claude includes them despite instructions
            const cleanJson = rawText
              .replace(/^```json\s*/i, '')
              .replace(/^```\s*/i, '')
              .replace(/\s*```$/i, '')
              .trim();

            scanResult = JSON.parse(cleanJson) as ReceiptScanResult;
          } catch (parseError: any) {
            this.logger.error(`Failed to parse Claude Vision response as JSON: ${parseError.message}`);
            this.logger.debug(`Raw response: ${rawText.substring(0, 500)}`);
            await this.rollBackUsage();
            usageIncremented = false;

            return this.failure(
              OP_RESULT_CODES.FAILED,
              `Failed to parse scan results. Please try again with a clearer photo.`
            );
          }

          // --- Validate the scan result structure ---
          if (typeof scanResult.success !== 'boolean' || !scanResult.fields || !scanResult.extra) {
            this.logger.error('Claude Vision response has unexpected structure');
            this.logger.debug(`Parsed response: ${JSON.stringify(scanResult).substring(0, 500)}`);
            await this.rollBackUsage();
            usageIncremented = false;

            return this.failure(
              OP_RESULT_CODES.FAILED,
              `Receipt scan returned unexpected data. Please try again.`
            );
          }

          // --- Handle unsuccessful scan ---
          if (!scanResult.success) {
            this.logger.log(
              `Receipt scan was not successful: ${scanResult.failureReason || 'Unknown reason'}`
            );
            await this.rollBackUsage();
            usageIncremented = false;

            // Still return the result — frontend can show the failure reason to user
            return this.success([scanResult]);
          }

          // --- From this point on, the scan was successful — usage stays incremented ---

          // --- Convert whenDone from user's local time to UTC ---
          if (scanResult.fields?.whenDone && currentTimeZoneOffset != null) {
            const offsetMinutes = Number(currentTimeZoneOffset);
            if (!isNaN(offsetMinutes)) {
              // Date.getTimezoneOffset() returns minutes such that UTC = localTime + offset
              // e.g., for UTC-7 (MST), offset = 420; for UTC+3 (Moscow), offset = -180
              const localTime = dayjs.utc(scanResult.fields.whenDone);
              if (localTime.isValid()) {
                const utcTime = localTime.add(offsetMinutes, 'minute');
                scanResult.fields.whenDone = utcTime.format('YYYY-MM-DDTHH:mm:ss');
                this.logger.debug(
                  `Converted whenDone from local "${localTime.format('YYYY-MM-DDTHH:mm:ss')}" ` +
                  `to UTC "${scanResult.fields.whenDone}" (offset: ${offsetMinutes} min)`
                );
              } else {
                this.logger.warn(`Could not parse whenDone value: "${scanResult.fields.whenDone}"`);
              }
            } else {
              this.logger.warn(`Invalid currentTimeZoneOffset value: "${currentTimeZoneOffset}"`);
            }
          }

          // --- Validate expenseType ---
          if (scanResult.expenseType !== 1 && scanResult.expenseType !== 2) {
            this.logger.warn(
              `Invalid expenseType ${scanResult.expenseType} from scan, defaulting to 2 (Expense)`
            );
            scanResult.expenseType = 2;
          }

          // --- Log usage for cost tracking ---
          const usage = aiData?.response?.usage;
          if (usage) {
            this.logger.log(
              `Receipt scan tokens used — input: ${usage.inputTokens}, output: ${usage.outputTokens}`
            );
          }

          this.logger.log(
            `Receipt scanned successfully: type=${scanResult.expenseType}, ` +
            `confidence=${scanResult.confidence}, description="${scanResult.description}"`
          );

          return this.success([scanResult]);
        } catch (error: any) {
          this.logger.error(`Failed to scan receipt: ${error.message}`);

          // Roll back usage on unexpected exceptions
          if (usageIncremented) {
            await this.rollBackUsage();
          }

          return this.failure(OP_RESULT_CODES.EXCEPTION, `Failed to scan receipt: ${error.message}`);
        } finally {
          // --- Clean up temp files and their directories ---
          const cleanedDirs = new Set<string>();

          for (const filePath of tempFilePaths) {
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                this.logger.debug(`Cleaned up temp file: ${filePath}`);
              }
              // Track parent directory for cleanup
              cleanedDirs.add(path.dirname(filePath));
            } catch (cleanupError: any) {
              this.logger.warn(`Failed to clean up temp file ${filePath}: ${cleanupError.message}`);
            }
          }

          // Remove empty temp directories (request-specific folders)
          for (const dirPath of cleanedDirs) {
            try {
              if (fs.existsSync(dirPath)) {
                const remaining = fs.readdirSync(dirPath);
                if (remaining.length === 0) {
                  fs.rmdirSync(dirPath);
                  this.logger.debug(`Cleaned up temp directory: ${dirPath}`);
                } else {
                  this.logger.warn(
                    `Temp directory not empty, skipping removal: ${dirPath} (${remaining.length} files remaining)`
                  );
                }
              }
            } catch (cleanupError: any) {
              this.logger.warn(`Failed to clean up temp directory ${dirPath}: ${cleanupError.message}`);
            }
          }
        }
      },
      hasTransaction: false,
      doingWhat: 'scanning expense receipt',
    });
  }

  /**
   * Rolls back a feature usage increment when the scan fails.
   * Silently handles errors — a failed rollback should not block
   * the error response to the user.
   */
  private async rollBackUsage(): Promise<void> {
    try {
      const decrementResult = await this.getGateways().appFeatureUsageGw.decrement({
        featureCode: FEATURE_CODES.MONTLY_RECEIPT_SCANS_QTY,
        headers: this.getHeaders()
      });

      if (decrementResult.code < 0) {
        this.logger.warn(
          `Failed to roll back scan usage: ${decrementResult.getErrorSummary()}`
        );
      } else {
        this.logger.log(`Rolled back scan usage for '${FEATURE_CODES.MONTLY_RECEIPT_SCANS_QTY}'`);
      }
    } catch (error: any) {
      this.logger.warn(`Exception rolling back scan usage: ${error.message}`);
    }
  }

  /**
   * ====== HELPERS
   */

  /**
   * Extract data from received submission, determines submission style (ajax, regular),
   * validates files and save them to a temp folder, does other checks
   * @param params request and response objects and requestId used to save files
   * @returns
   */
  public async extractFormData(params: any): Promise<OpResult> {
    const { req, res, requestId } = params;
    const result = new OpResult();

    try {
      const contentType = req.headers['content-type'] || '';
      let formData: any = {};
      let formFiles: any = {};
      let fileWarnings: Array<{ fieldName: string; fileName: string; warning: string }> = [];

      // Determine if it's a regular form submission or AJAX
      const isAjax =
        req.headers['x-requested-with'] === 'XMLHttpRequest' ||
        (req.headers['accept'] || '').includes('application/json');

      let mode = isAjax ? 'ajax' : 'form';

      this.logger.log(
        `Extracting form data from submission ${requestId} (mode: ${mode}, content type: ${contentType})`,
      );

      // Handle multipart form data (forms with files)
      if (contentType.includes('multipart/form-data')) {
        // Configure multer for disk storage - use requestId for unique folder
        const tempDir = getTempUploadPath(requestId);

        this.logger.log('Temp dir to store files', tempDir);

        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) {
          this.logger.log('Temp dir to store files does not exist, create it');
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const storage = multer.diskStorage({
          destination: (req, file, cb) => {
            this.logger.log('Destination called for file:', file);
            cb(null, tempDir);
          },
          filename: (req, file, cb) => {
            // Generate unique filename: timestamp-random-originalname
            const timestamp = Date.now();
            const random = randomString(8, 'abcdefghijklmnopqrstuvwxyz0123456789');
            // Sanitize the original filename before using in storage name
            const sanitizedOriginal = sanitizeFilename(file.originalname);
            const ext = path.extname(sanitizedOriginal);
            const nameWithoutExt = path.basename(sanitizedOriginal, ext);
            const uniqueName = `${timestamp}-${random}-${nameWithoutExt}${ext}`;
            this.logger.log('Uploaded filename to store is:', uniqueName);
            cb(null, uniqueName);
          },
        });

        const maxFileSize = 10 * 1024 * 1024; // 10MB per file
        const maxFilesQty = 20; // Max 20 files per submission

        const upload = multer({
          storage,
          limits: {
            fileSize: maxFileSize,
            files: maxFilesQty,
          },
          fileFilter: (req, file, cb) => {
            // Validate field name for prototype pollution
            const fieldValidation = validateFieldName(file.fieldname);
            if (!fieldValidation.isValid) {
              cb(new Error(`Invalid field name: ${fieldValidation.error}`));
              return;
            }

            // Check for executable files
            if (isExecutableFile({ originalname: file.originalname, mimetype: file.mimetype })) {
              cb(
                new Error(
                  `File type not allowed: ${file.originalname}. Executable files are blocked for security reasons.`,
                ),
              );
              return;
            }

            cb(null, true);
          },
        });

        // Process the multipart data
        await new Promise<void>((resolve, reject) => {
          upload.any()(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
              if (err.code === 'LIMIT_FILE_SIZE') {
                this.logger.log(`File submitted as ${err.field} is too large. The limit is ${maxFileSize} bytes`);
                reject(new Error('File size exceeds 10MB limit'));
              } else if (err.code === 'LIMIT_FILE_COUNT') {
                this.logger.log(
                  `Files count limit has been reached for ${err.field}. The limit is ${maxFilesQty} files`,
                );
                reject(new Error('Too many files. Maximum 20 files allowed'));
              } else {
                this.logger.log(`Failed to receive files as ${err.field}: ${err.message}`);
                reject(new Error(`(1) File upload error: ${err.message}`));
              }
            } else if (err) {
              this.logger.log(`(2) Failed to receive files as ${err.field}: ${err.message}`);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        // Extract form fields from req.body
        // Validate field names in form data to prevent prototype pollution
        const rawFormData = req.body || {};
        for (const key of Object.keys(rawFormData)) {
          const fieldValidation = validateFieldName(key);
          if (fieldValidation.isValid) {
            formData[key] = rawFormData[key];
          } else {
            this.logger.warn(`Skipping invalid field name in form data: ${key}`);
          }
        }

        // Extract and organize files by field name
        if (req.files && Array.isArray(req.files)) {
          for (const file of req.files) {
            // Check for executable files by analyzing actual file content
            const securityCheck: FileSecurityResult = await isExecutableOrDangerousFile({
              originalname: file.originalname,
              mimetype: file.mimetype,
              path: file.path,
            });

            if (securityCheck.isDangerous) {
              // Delete the file immediately
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
              result.addError(
                file.fieldname,
                `File blocked for security: ${file.originalname}. ${securityCheck.reason}`,
                OP_RESULT_CODES.VALIDATION_FAILED,
              );
              continue;
            }

            // Collect warnings for later notification
            if (securityCheck.warning) {
              fileWarnings.push({
                fieldName: file.fieldname,
                fileName: file.originalname,
                warning: securityCheck.warning,
              });
            }

            // Sanitize field name (already validated in fileFilter, but sanitize for safety)
            const safeFieldName = sanitizeFieldName(file.fieldname);

            // Sanitize the original filename for storage
            const safeOriginalName = sanitizeFilename(file.originalname);

            if (!formFiles[safeFieldName]) {
              formFiles[safeFieldName] = [];
            }
            formFiles[safeFieldName].push({
              fieldname: safeFieldName,
              originalname: safeOriginalName,
              encoding: file.encoding,
              mimetype: file.mimetype,
              filename: file.filename,
              path: file.path,
              size: file.size,
            });
          }
        }

        // If we found blocked files, return error
        if (result.didFail()) {
          this.logger.log('Failed to process received files:', result.getErrorSummary());
          // Clean up any successfully uploaded files before returning
          for (const fieldName of Object.keys(formFiles)) {
            for (const file of formFiles[fieldName]) {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            }
          }
          return result;
        }
      }

      // Handle JSON requests (AJAX with JSON body)
      else if (contentType.includes('application/json')) {
        mode = 'ajax';
        // Validate field names in JSON body
        const rawFormData = req.body || {};
        for (const key of Object.keys(rawFormData)) {
          const fieldValidation = validateFieldName(key);
          if (fieldValidation.isValid) {
            formData[key] = rawFormData[key];
          } else {
            this.logger.warn(`Skipping invalid field name in JSON body: ${key}`);
          }
        }
      }
      // Handle URL-encoded form data (simple forms without files)
      else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Check if it's actually an AJAX request
        const isAjax =
          req.headers['x-requested-with'] === 'XMLHttpRequest' ||
          (req.headers['accept'] || '').includes('application/json');

        mode = isAjax ? 'ajax' : 'form';

        // Validate field names
        const rawFormData = req.body || {};
        for (const key of Object.keys(rawFormData)) {
          const fieldValidation = validateFieldName(key);
          if (fieldValidation.isValid) {
            formData[key] = rawFormData[key];
          } else {
            this.logger.warn(`Skipping invalid field name in URL-encoded body: ${key}`);
          }
        }
      }
      // Fallback - try to use parsed body
      else {
        // Validate field names
        const rawFormData = req.body || {};
        for (const key of Object.keys(rawFormData)) {
          const fieldValidation = validateFieldName(key);
          if (fieldValidation.isValid) {
            formData[key] = rawFormData[key];
          } else {
            this.logger.warn(`Skipping invalid field name in body: ${key}`);
          }
        }
        mode = 'ajax';
      }

      this.logger.debug(`The data have been extracted from the request`, { formData, formFiles });

      result.setData({
        mode,
        formData,
        formFiles,
        fileWarnings, // Pass warnings to be used in notifications
      });
    } catch (error: any) {
      result.addError('', `Failed to extract form data: ${error.message}`, OP_RESULT_CODES.FAILED);
    }

    return result;
  }
}

export { ScannerCore };