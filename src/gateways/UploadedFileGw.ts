import { omit } from 'lodash';
import { OpResult, queryGraphQL } from '@sdflc/api-helpers';
import { HEADERS } from '@sdflc/backend-helpers';
import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

import { logger } from '../../logger';
import config from '../../config';

interface UploadedFileFilter {
  id?: string[];
  accountId?: string[];
  userId?: string[];
  name?: string;
  filePath?: string;
  nameLike?: string;
  filePathLike?: string;
  status?: number[];
}

interface UploadedFileInput {
  filePath?: string | null;
  name?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  notes?: string | null;
  status?: number | null;
}

interface UploadedFileWhereInput {
  id?: string;
  accountId?: string;
  userId?: string;
  nameLike?: string;
  filePathLike?: string;
}

interface UploadFileParams {
  accountId: string;
  userId?: string;
  filePath: string;
  name?: string;
  originalFilename: string;
  mimeType: string;
  notes?: string;
}

class UploadedFileGw {
  private storageUrl: string;
  private lastCreateError: OpResult = new OpResult();

  constructor() {
    // Storage microservice URL - adjust based on your config
    this.storageUrl = config.storageUrl || 'http://localhost:4060';
  }

  public getLastCreateError() {
    return this.lastCreateError;
  }

  public async list(args: any) {
    const { headers, filter, params } = args || {};

    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'uploadedFileList',
      query: `
        query UploadedFileList($filter: UploadedFileFilter, $params: PaginationAndSorting) {
          uploadedFileList(filter: $filter, params: $params) {
            code
            errors {
              name
              errors
            }
            data {
              id
              accountId
              userId
              sizeBytes
              filePath
              name
              originalFilename
              fileUrl
              thumbnailUrl
              mimeType
              notes
              status
            }
          }
        }
      `,
      variables: {
        filter,
        params,
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
        ...omit(headers, Object.keys(config.skipHeaders)),
      },
    });

    if (result.code < 0) {
      logger.log(`Failed to list uploaded files. Result code ${result.code}:`, result.errors);
    }

    return Array.isArray(result.data) ? result.data : [];
  }

  public async get(id: string) {
    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'uploadedFileGet',
      query: `
        query UploadedFileGet($id: ID) {
          uploadedFileGet(id: $id) {
            code
            errors {
              name
              errors
            }
            data {
              id
              accountId
              userId
              sizeBytes
              filePath
              name
              originalFilename
              fileUrl
              thumbnailUrl
              mimeType
              notes
              status
            }
          }
        }
      `,
      variables: {
        id,
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
      },
    });

    if (result.code < 0) {
      logger.log(`Failed to get uploaded file by ID '${id}'. Result code ${result.code}:`, result.errors);
    }

    return Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null;
  }

  public async getMany(ids: string[]) {
    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'uploadedFileGetMany',
      query: `
        query UploadedFileGetMany($ids: [ID]) {
          uploadedFileGetMany(ids: $ids) {
            code
            errors {
              name
              errors
            }
            data {
              id
              accountId
              userId
              sizeBytes
              filePath
              name
              originalFilename
              fileUrl
              thumbnailUrl
              mimeType
              notes
              status
            }
          }
        }
      `,
      variables: {
        ids,
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
      },
    });

    if (result.code < 0) {
      logger.log(
        `Failed to get uploaded files by IDs '${ids.join(', ')}'. Result code ${result.code}:`,
        JSON.stringify(result.errors, null, 2),
      );
    }

    return Array.isArray(result.data) ? result.data : [];
  }

  /**
   * Upload a file to the storage microservice via REST API
   * @param params - Upload parameters including file path and metadata
   * @returns Uploaded file data or null on failure
   */
  public async create(params: UploadFileParams) {
    try {
      const formData = new FormData();

      // Add file from disk
      const fileStream = fs.createReadStream(params.filePath);
      formData.append('files', fileStream, {
        filename: params.originalFilename,
        contentType: params.mimeType,
      });

      // Add metadata
      formData.append('accountId', params.accountId);
      if (params.userId) {
        formData.append('userId', params.userId);
      }
      if (params.name) {
        formData.append('name', params.name);
      }
      formData.append('originalFilename', params.originalFilename);
      formData.append('mimeType', params.mimeType);
      if (params.notes) {
        formData.append('notes', params.notes);
      }

      // Use axios instead of fetch for proper FormData streaming
      const response = await axios.post(`${this.storageUrl}/uploaded-file`, formData, {
        headers: {
          [HEADERS.SPACE_ID]: config.spaceId,
          [HEADERS.API_KEY]: config.interserviceApiKey,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const result = response.data;

      this.lastCreateError = new OpResult(response.data);

      if (result.code < 0) {
        logger.log(
          `Failed to upload file '${params.originalFilename}'. Result code ${result.code}:`,
          JSON.stringify(result.errors, null, 2),
        );
        return null;
      }

      return Array.isArray(result.data) && result.data.length > 0 ? result.data[0] : null;
    } catch (error: any) {
      logger.error(`Exception while uploading file '${params.originalFilename}':`, error.message);
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data:`, error.response.data);
      }
      return null;
    }
  }

  public async update(where: UploadedFileWhereInput, params: UploadedFileInput) {
    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'uploadedFileUpdate',
      query: `
        mutation UploadedFileUpdate($where: UploadedFileWhereInput, $params: UploadedFileInput) {
          uploadedFileUpdate(where: $where, params: $params) {
            code
            errors {
              name
              errors
            }
            data {
              id
              accountId
              userId
              sizeBytes
              filePath
              name
              originalFilename
              fileUrl
              thumbnailUrl
              mimeType
              notes
              status
            }
          }
        }
      `,
      variables: {
        where,
        params,
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
      },
    });

    if (result.code < 0) {
      logger.log(`Failed to update uploaded file. Result code ${result.code}:`, JSON.stringify(result.errors, null, 2));
    }

    return Array.isArray(result.data) ? result.data : [];
  }

  public async remove(where: UploadedFileWhereInput) {
    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'uploadedFileRemove',
      query: `
        mutation UploadedFileRemove($where: UploadedFileWhereInput) {
          uploadedFileRemove(where: $where) {
            code
            errors {
              name
              errors
            }
            data {
              id
            }
          }
        }
      `,
      variables: {
        where,
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
      },
    });

    if (result.code < 0) {
      logger.log(`Failed to remove uploaded file. Result code ${result.code}:`, JSON.stringify(result.errors, null, 2));
    }

    return Array.isArray(result.data) ? result.data : [];
  }

  public async removeMany(where: UploadedFileWhereInput[]) {
    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'uploadedFileRemoveMany',
      query: `
        mutation UploadedFileRemoveMany($where: [UploadedFileWhereInput]) {
          uploadedFileRemoveMany(where: $where) {
            code
            errors {
              name
              errors
            }
            data {
              id
            }
          }
        }
      `,
      variables: {
        where,
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
      },
    });

    if (result.code < 0) {
      logger.log(
        `Failed to remove uploaded files. Result code ${result.code}:`,
        JSON.stringify(result.errors, null, 2),
      );
    }

    return Array.isArray(result.data) ? result.data : [];
  }
}

export { UploadedFileGw };
