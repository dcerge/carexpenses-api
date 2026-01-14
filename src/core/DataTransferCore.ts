// ./src/core/DataTransferCore.ts
import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import mime from 'mime-types';
import { randomUUID } from 'crypto';

import { OP_RESULT_CODES } from '@sdflc/api-helpers';
import {
  BaseCorePropsInterface,
  BaseCoreActionsInterface,
  createUserToken,
  getDefaultJwtAlgorithm,
  getDefaultJwtIssuer,
  verifyUserToken,
} from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { USER_ROLES } from '../boundary';
import config from '../config';

// =============================================================================
// Constants
// =============================================================================

const CHUNK_SIZE = 50;
const PROCESS_STATUS_SUCCESS = 1;
const PROCESS_STATUS_ERROR = 2;
const PROCESS_STATUS_FILE_NOT_FOUND = 3;

// =============================================================================
// Core Class
// =============================================================================

class DataTransferCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'entityAttachmentGw',
      name: 'DataTransferCore',
      hasOrderNo: false,
      doAuth: false,
    });
  }

  private accountIdToUserIdMap: Map<string, string> = new Map([
    ['0e3f69dc-d3d4-4884-86d2-eaf8a0afa7ef', 'a3d277f1-e091-436d-baf4-94c8acfa48ef'],
    ['0f89a1d8-9a70-4bfa-949f-aaa64d6a073e', 'fec3fc05-b6b3-446f-a195-220e884aac02'],
    ['2a07e8b5-c0d3-4804-bd24-7aa93752d8f7', 'ee83be5b-5fd2-47cd-a5ae-8c833aa99469'],
    ['3323f292-065e-4aaa-89b6-ccc79fb78797', '426d23e5-1a6f-4033-b5ab-89aff65856ac'],
    ['55082624-1327-47cf-b4fb-d354f63ae7d3', 'dd4af0d5-28b9-4b3b-9a37-da44aa650b9a'],
    ['5a45407a-70a2-4099-9a11-18fcb9b08a07', 'f452cc32-d631-4ccb-a111-7f249327d84c'],
    ['76a7f981-0e65-4ddc-83d4-ce542b6cb525', '77b64bdb-d6b3-4f58-8767-6e2fd6864aae'],
    ['7ab7cbdb-e694-43d7-86bf-f1f65cc04b43', '0175f9ab-b9fd-4f8f-ac60-873e04848ba2'],
    ['9342fb3b-ecf2-42a6-b86e-5cad99168c1f', '01e61f9b-431f-4a74-ad84-46ede211af86'],
    ['97e798a3-0a18-41de-9a87-6b2e2fcee536', '9ff7c03f-5b01-4dbd-a6a2-3d182f5050f1'],
    ['b6663f20-d05f-4461-9b09-e39141fb4488', 'de90da87-5892-4891-96c4-e6b1f19da07c'],
    ['d7d76800-3f99-4ddd-a09a-c2fb7680bdd5', 'c64915e3-2359-4be3-bd93-07ff2a3bbb7e'],
    ['fa3c92a7-dcfe-4e53-ab80-be1e86655220', '5fceccd1-22c6-4e6d-9935-c2d38720e6fb'],
  ]);

  private generateToken(args: { userId: string; accountId: string }) {
    const { userId, accountId } = args;

    const spaceId = 'carexpenses';
    const tokenSecret = config.jwtSecret;
    const tokenExpiresInMin = 60;

    const token = createUserToken(
      {
        spaceId: spaceId || '',
        accountId: accountId,
        roleId: USER_ROLES.OWNER,
        userId: userId,
        lang: 'en',
      },
      tokenSecret,
      {
        algorithm: getDefaultJwtAlgorithm(),
        issuer: getDefaultJwtIssuer(),
        audience: [spaceId || ''],
        noTimestamp: false,
        header: {},
        keyid: '',
        expiresIn: tokenExpiresInMin * 60,
        useFingerprint: true,
      },
    );

    return token.getDataFirst();
  }

  /**
   * Extract filename from Azure blob URL
   */
  private extractFilenameFromPath(attachmentPath: string): string {
    try {
      const url = new URL(attachmentPath);
      const pathParts = url.pathname.split('/');
      return pathParts[pathParts.length - 1] || 'unknown';
    } catch {
      // If URL parsing fails, try simple string split
      const parts = attachmentPath.split('/');
      return parts[parts.length - 1] || 'unknown';
    }
  }

  /**
   * Download file from URL to temp location
   * Returns true if successful, false if file not found
   * Throws for other errors
   */
  private async downloadFile(url: string, tempPath: string): Promise<boolean> {
    try {
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
      });

      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(true));
        writer.on('error', reject);
      });
    } catch (error: any) {
      // Check if it's a 404 or similar "not found" error
      if (error.response && (error.response.status === 404 || error.response.status === 403)) {
        return false;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Clean up temp file safely
   */
  private cleanupTempFile(tempPath: string): void {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (err) {
      this.logger.log(`Warning: Failed to cleanup temp file ${tempPath}`);
    }
  }

  public async transferFiles(args: any) {
    return this.runAction({
      args,
      doAuth: false,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { entityAttachmentGw, entityEntityAttachmentGw, uploadedFileGw } = this.getGateways();

        const stats = {
          processed: 0,
          moved: 0,
          skipped: 0,
          failed: 0,
          notFound: 0,
        };

        // Cache for already migrated attachments (orig_id -> uploaded_file_id)
        const migratedAttachments: Map<string, string> = new Map();

        // Cache for attachments where file was not found (orig_id -> true)
        const notFoundAttachments: Map<string, boolean> = new Map();

        let hasMore = true;

        while (hasMore) {
          // Fetch chunk of unprocessed entity_entity_attachments
          const entityEntityAttachments = await entityEntityAttachmentGw.list({
            filter: {
              processStatus: null,
            },
            params: {
              pagination: { pageSize: CHUNK_SIZE },
            },
          });

          if (entityEntityAttachments.length === 0) {
            this.logger.log('No more unprocessed records found');
            hasMore = false;
            break;
          }

          this.logger.log(`Processing chunk of ${entityEntityAttachments.length} records`);

          // Collect unique entity_attachment_orig_ids
          const origIds = [
            ...new Set(
              entityEntityAttachments.map((r: any) => r.entityAttachmentOrigId).filter((id: any) => id != null),
            ),
          ];

          // Batch fetch entity_attachments by orig_id
          const entityAttachments = await entityAttachmentGw.list({
            filter: {
              origId: origIds,
            },
          });

          // Build lookup map: orig_id -> entity_attachment
          const attachmentByOrigId = new Map<string, any>();

          for (const ea of entityAttachments) {
            if (ea.origId != null) {
              attachmentByOrigId.set(String(ea.origId), ea);
            }
          }

          // Process each record in the chunk
          for (const eea of entityEntityAttachments) {
            let tempFilePath: string | null = null;

            try {
              stats.processed++;

              const attachment = attachmentByOrigId.get(String(eea.entityAttachmentOrigId));

              if (!attachment) {
                this.logger.log(`ERROR: Entity attachment not found for orig_id ${eea.entityAttachmentOrigId}`);
                await entityEntityAttachmentGw.update({ id: eea.id }, { processStatus: PROCESS_STATUS_ERROR });
                stats.failed++;
                throw new Error(`Entity attachment not found for orig_id ${eea.entityAttachmentOrigId}`);
              }

              let uploadedFileId = attachment.uploadedFileId;

              // Check if we already know this file doesn't exist
              if (!uploadedFileId && notFoundAttachments.has(String(attachment.origId))) {
                this.logger.log(`Skipping - file was previously not found for attachment orig_id ${attachment.origId}`);
                await entityEntityAttachmentGw.update({ id: eea.id }, { processStatus: PROCESS_STATUS_FILE_NOT_FOUND });
                stats.notFound++;
                continue;
              }

              // Check if we already migrated this attachment in a previous iteration
              if (!uploadedFileId && migratedAttachments.has(String(attachment.origId))) {
                uploadedFileId = migratedAttachments.get(String(attachment.origId));
                this.logger.log(
                  `Using cached uploaded_file_id ${uploadedFileId} for attachment orig_id ${attachment.origId}`,
                );
              }

              if (!uploadedFileId) {
                // Need to migrate file from Azure to storage microservice
                const accountId = attachment.accountId;
                const userId = this.accountIdToUserIdMap.get(accountId);

                if (!userId) {
                  this.logger.log(`ERROR: No userId mapping for accountId ${accountId}`);
                  await entityEntityAttachmentGw.update({ id: eea.id }, { processStatus: PROCESS_STATUS_ERROR });
                  stats.failed++;
                  throw new Error(`No userId mapping for accountId ${accountId}`);
                }

                // Generate auth token
                const { token, fingerprint } = this.generateToken({
                  accountId,
                  userId,
                });

                // Extract filename from path
                const filenameFromPath = this.extractFilenameFromPath(attachment.attachmentPath);

                // Create temp file path
                tempFilePath = path.join(os.tmpdir(), `carexp_${Date.now()}_${filenameFromPath}`);

                this.logger.log(`Downloading file from ${attachment.attachmentPath}`);

                // Download file from Azure
                const downloadSuccess = await this.downloadFile(attachment.attachmentPath, tempFilePath);

                if (!downloadSuccess) {
                  // File not found in Azure storage
                  this.logger.log(`WARNING: File not found at ${attachment.attachmentPath}`);
                  this.cleanupTempFile(tempFilePath);
                  tempFilePath = null;

                  // Cache that this attachment's file doesn't exist
                  notFoundAttachments.set(String(attachment.origId), true);

                  // Mark as file not found and continue to next record
                  await entityEntityAttachmentGw.update(
                    { id: eea.id },
                    { processStatus: PROCESS_STATUS_FILE_NOT_FOUND },
                  );
                  stats.notFound++;
                  continue;
                }

                // Get MIME type from extension
                const mimeType = mime.lookup(filenameFromPath) || 'application/octet-stream';

                // Get original filename: prefer description, fallback to filename from path
                const originalFilename = attachment.description?.trim() || filenameFromPath;

                this.logger.log(`Uploading file: ${originalFilename} (${mimeType})`);

                // Upload to storage microservice
                const uploadedFile = await uploadedFileGw.create({
                  accountId,
                  userId,
                  filePath: tempFilePath,
                  name: originalFilename,
                  originalFilename,
                  mimeType,
                  headers: {
                    authorization: token,
                    'x-fingerprint': fingerprint,
                  },
                });

                // Clean up temp file
                this.cleanupTempFile(tempFilePath);
                tempFilePath = null;

                if (!uploadedFile) {
                  const lastError = uploadedFileGw.getLastCreateError();
                  this.logger.log(
                    `ERROR: Failed to upload file for entity_attachment ${attachment.id}. Error: ${JSON.stringify(lastError.errors)}`,
                  );
                  await entityEntityAttachmentGw.update({ id: eea.id }, { processStatus: PROCESS_STATUS_ERROR });
                  stats.failed++;
                  throw new Error(`Failed to upload file for entity_attachment ${attachment.id}`);
                }

                uploadedFileId = uploadedFile.id;

                // Update entity_attachment with uploaded_file_id
                await entityAttachmentGw.update({ id: attachment.id }, { uploadedFileId });

                // Cache the mapping for future records referencing the same attachment
                migratedAttachments.set(String(attachment.origId), uploadedFileId);

                this.logger.log(`Successfully uploaded file, uploadedFileId: ${uploadedFileId}`);
                stats.moved++;
              } else {
                this.logger.log(
                  `Skipping download - attachment ${attachment.id} already has uploadedFileId: ${uploadedFileId}`,
                );
                stats.skipped++;
              }

              // Update entity_entity_attachment with uploaded_file_id and success status
              await entityEntityAttachmentGw.update(
                { id: eea.id },
                {
                  uploadedFileId,
                  processStatus: PROCESS_STATUS_SUCCESS,
                },
              );

              this.logger.log(`Successfully processed entity_entity_attachment ${eea.id}`);
            } catch (error: any) {
              // Clean up temp file if exists
              if (tempFilePath) {
                this.cleanupTempFile(tempFilePath);
              }

              this.logger.log(`FATAL: Stopping due to error: ${error.message}`);

              // Return current stats with error
              return this.failure(OP_RESULT_CODES.FAILED, error.message, stats);
            }
          }

          this.logger.log(
            `Chunk completed. Stats: processed=${stats.processed}, moved=${stats.moved}, skipped=${stats.skipped}, failed=${stats.failed}, notFound=${stats.notFound}`,
          );
        }

        this.logger.log(
          `Transfer complete. Final stats: processed=${stats.processed}, moved=${stats.moved}, skipped=${stats.skipped}, failed=${stats.failed}, notFound=${stats.notFound}`,
        );

        return this.success(stats);
      },
      hasTransaction: false, // No transaction - we want partial progress saved
      doingWhat: 'transferring files from Azure to storage microservice',
    });
  }

  public async transferCarImages(args: any) {
    return this.runAction({
      args,
      doAuth: false,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { carGw, entityAttachmentGw, uploadedFileGw } = this.getGateways();

        const stats = {
          processed: 0,
          moved: 0,
          skipped: 0,
          failed: 0,
          notFound: 0,
        };

        let hasMore = true;

        while (hasMore) {
          // Fetch chunk of cars that have entity_attachment_id but no uploaded_file_id
          const cars = await carGw.list({
            filter: {
              hasEntityAttachmentId: true,
              hasNoUploadedFileId: true,
            },
            params: {
              pagination: { pageSize: CHUNK_SIZE },
            },
          });

          if (cars.length === 0) {
            this.logger.log('No more cars to process');
            hasMore = false;
            break;
          }

          this.logger.log(`Processing chunk of ${cars.length} cars`);

          // Collect unique entity_attachment_ids
          const attachmentIds = [
            ...new Set(cars.map((c: any) => c.entityAttachmentId).filter((id: any) => id != null)),
          ];

          // Batch fetch entity_attachments by id
          const entityAttachments = await entityAttachmentGw.list({
            filter: {
              id: attachmentIds,
            },
          });

          // Build lookup map: id -> entity_attachment
          const attachmentById = new Map<string, any>();

          for (const ea of entityAttachments) {
            if (ea.id != null) {
              attachmentById.set(String(ea.id), ea);
            }
          }

          // Process each car
          for (const car of cars) {
            let tempFilePath: string | null = null;

            try {
              stats.processed++;

              const attachment = attachmentById.get(String(car.entityAttachmentId));

              if (!attachment) {
                this.logger.log(
                  `WARNING: Entity attachment not found for car ${car.id} (entityAttachmentId: ${car.entityAttachmentId})`,
                );
                stats.notFound++;
                continue;
              }

              // Check if the attachment already has an uploaded_file_id (from previous transfer)
              let uploadedFileId = attachment.uploadedFileId;

              if (uploadedFileId) {
                // Attachment was already migrated, just update the car
                this.logger.log(`Using existing uploaded_file_id ${uploadedFileId} from attachment for car ${car.id}`);
                await carGw.update({ id: car.id }, { uploadedFileId });
                stats.skipped++;
                this.logger.log(`Successfully updated car ${car.id} with existing uploadedFileId`);
                continue;
              }

              // Need to migrate file from Azure to storage microservice
              const accountId = car.accountId;
              const userId = this.accountIdToUserIdMap.get(accountId);

              if (!userId) {
                this.logger.log(`ERROR: No userId mapping for accountId ${accountId}`);
                stats.failed++;
                throw new Error(`No userId mapping for accountId ${accountId}`);
              }

              // Generate auth token
              const { token, fingerprint } = this.generateToken({
                accountId,
                userId,
              });

              // Extract filename from path
              const filenameFromPath = this.extractFilenameFromPath(attachment.attachmentPath);

              // Create temp file path
              tempFilePath = path.join(os.tmpdir(), `carexp_car_${Date.now()}_${filenameFromPath}`);

              this.logger.log(`Downloading car image from ${attachment.attachmentPath}`);

              // Download file from Azure
              const downloadSuccess = await this.downloadFile(attachment.attachmentPath, tempFilePath);

              if (!downloadSuccess) {
                // File not found in Azure storage
                this.logger.log(`WARNING: Car image file not found at ${attachment.attachmentPath}`);
                this.cleanupTempFile(tempFilePath);
                tempFilePath = null;
                stats.notFound++;
                continue;
              }

              // Get MIME type from extension
              const mimeType = mime.lookup(filenameFromPath) || 'application/octet-stream';

              // Get original filename: prefer description, fallback to filename from path
              const originalFilename = attachment.description?.trim() || filenameFromPath;

              this.logger.log(`Uploading car image: ${originalFilename} (${mimeType})`);

              // Upload to storage microservice
              const uploadedFile = await uploadedFileGw.create({
                accountId,
                userId,
                filePath: tempFilePath,
                name: originalFilename,
                originalFilename,
                mimeType,
                headers: {
                  authorization: token,
                  'x-fingerprint': fingerprint,
                },
              });

              // Clean up temp file
              this.cleanupTempFile(tempFilePath);
              tempFilePath = null;

              if (!uploadedFile) {
                const lastError = uploadedFileGw.getLastCreateError();
                this.logger.log(
                  `ERROR: Failed to upload car image for car ${car.id}. Error: ${JSON.stringify(lastError.errors)}`,
                );
                stats.failed++;
                throw new Error(`Failed to upload car image for car ${car.id}`);
              }

              uploadedFileId = uploadedFile.id;

              // Update entity_attachment with uploaded_file_id (for future reference)
              await entityAttachmentGw.update({ id: attachment.id }, { uploadedFileId });

              // Update car with uploaded_file_id
              await carGw.update({ id: car.id }, { uploadedFileId });

              this.logger.log(`Successfully uploaded car image, uploadedFileId: ${uploadedFileId}`);
              stats.moved++;
            } catch (error: any) {
              // Clean up temp file if exists
              if (tempFilePath) {
                this.cleanupTempFile(tempFilePath);
              }

              this.logger.log(`FATAL: Stopping due to error: ${error.message}`);

              // Return current stats with error
              return this.failure(OP_RESULT_CODES.FAILED, error.message, stats);
            }
          }

          this.logger.log(
            `Chunk completed. Stats: processed=${stats.processed}, moved=${stats.moved}, skipped=${stats.skipped}, failed=${stats.failed}, notFound=${stats.notFound}`,
          );
        }

        this.logger.log(
          `Car image transfer complete. Final stats: processed=${stats.processed}, moved=${stats.moved}, skipped=${stats.skipped}, failed=${stats.failed}, notFound=${stats.notFound}`,
        );

        return this.success(stats);
      },
      hasTransaction: false,
      doingWhat: 'transferring car images from Azure to storage microservice',
    });
  }
}

export { DataTransferCore };
