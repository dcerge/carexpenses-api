// ./src/utils/connectorFileHelpers.ts
import { OpResult } from '@sdflc/api-helpers';
import {
  AzureBlobConnectorConfig,
  CONNECTOR_TYPES,
  AwsS3ConnectorConfig,
  GcpStorageConnectorConfig,
  FtpConnectorConfig,
} from '../boundary';
import { ConnectorAzureBlobGw, ConnectorAwsS3Gw, ConnectorGcpStorageGw, ConnectorFtpGw } from '../gateways';
import { parseOptions } from './parserHelpers';
import { decryptConnectorConfig } from './connectorMisc';

export interface FileToUpload {
  fieldName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
}

export interface UploadedFileResult {
  fieldName: string;
  fileName: string;
  fileUrl: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  success: boolean;
  error?: string;
}

export interface UploadFilesWithConnectorParams {
  connector: any;
  form: {
    id: string;
    name: string;
    accountId: string;
  };
  submission: {
    id: string;
    requestId: string;
  };
  formFiles: Record<string, any[]>;
}

export interface UploadFilesWithConnectorResult {
  uploadedFiles: UploadedFileResult[];
  failedFiles: UploadedFileResult[];
  totalFiles: number;
  successCount: number;
  failureCount: number;
}

interface UploadToConnectorParams {
  connector: any;
  form: {
    id: string;
    name: string;
    accountId: string;
  };
  submission: {
    id: string;
    requestId: string;
  };
  filesToUpload: FileToUpload[];
  uploadedFiles: UploadedFileResult[];
  failedFiles: UploadedFileResult[];
}

interface FileUploadParams {
  filePath: string;
  fileName: string;
  mimeType: string;
  originalFileName: string;
  metadata: {
    requestId: string;
    formId: string;
    formName: string;
  };
}

interface ConnectorUploadAdapter<TConfig extends Record<string, any>> {
  /** Default config values */
  defaults: TConfig;
  /** Validate config, return error message if invalid */
  validate: (config: TConfig) => string | null;
  /** Additional validation (e.g., JSON parsing), return error message if invalid */
  additionalValidation?: (config: TConfig) => string | null;
  /** Create and configure the gateway, return upload function */
  createUploader: (config: TConfig) => (params: FileUploadParams) => Promise<OpResult>;
  /** Extract storage path from upload result */
  getStoragePath: (resultData: any) => string;
}

const DEFAULT_FILENAME_PATTERN = '{{requestId}}.json';

// =============================================================================
// Connector Adapters
// =============================================================================

const azureBlobAdapter: ConnectorUploadAdapter<AzureBlobConnectorConfig> = {
  defaults: {
    connectionString: '',
    containerName: '',
    pathPrefix: '',
    fileNamePattern: DEFAULT_FILENAME_PATTERN,
  },
  validate: (config) => {
    if (!config.connectionString || !config.containerName) {
      return 'Azure Blob connector is not properly configured (missing connection string or container name)';
    }
    return null;
  },
  createUploader: (config) => {
    const gw = new ConnectorAzureBlobGw();
    gw.configure({
      connectionString: config.connectionString,
      containerName: config.containerName,
      pathPrefix: config.pathPrefix || '',
      fileNamePattern: config.fileNamePattern,
    });
    return (params) => gw.uploadFile(params);
  },
  getStoragePath: (resultData) => resultData.blobName,
};

const awsS3Adapter: ConnectorUploadAdapter<AwsS3ConnectorConfig> = {
  defaults: {
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    bucketName: '',
    pathPrefix: '',
    fileNamePattern: DEFAULT_FILENAME_PATTERN,
  },
  validate: (config) => {
    if (!config.accessKeyId || !config.secretAccessKey || !config.region || !config.bucketName) {
      return 'AWS S3 connector is not properly configured (missing credentials, region, or bucket name)';
    }
    return null;
  },
  createUploader: (config) => {
    const gw = new ConnectorAwsS3Gw();
    gw.configure({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      bucketName: config.bucketName,
      pathPrefix: config.pathPrefix || '',
      fileNamePattern: config.fileNamePattern,
    });
    return (params) => gw.uploadFile(params);
  },
  getStoragePath: (resultData) => resultData.key,
};

const gcpStorageAdapter: ConnectorUploadAdapter<GcpStorageConnectorConfig> = {
  defaults: {
    projectId: '',
    credentials: '',
    bucketName: '',
    pathPrefix: '',
    fileNamePattern: DEFAULT_FILENAME_PATTERN,
  },
  validate: (config) => {
    if (!config.projectId || !config.credentials || !config.bucketName) {
      return 'GCP Storage connector is not properly configured (missing project ID, credentials, or bucket name)';
    }
    return null;
  },
  additionalValidation: (config) => {
    try {
      JSON.parse(config.credentials);
      return null;
    } catch {
      return 'GCP Storage connector credentials are not valid JSON';
    }
  },
  createUploader: (config) => {
    const gw = new ConnectorGcpStorageGw();
    gw.configure({
      projectId: config.projectId,
      credentials: config.credentials,
      bucketName: config.bucketName,
      pathPrefix: config.pathPrefix || '',
      fileNamePattern: config.fileNamePattern,
    });
    return (params) => gw.uploadFile(params);
  },
  getStoragePath: (resultData) => resultData.objectName,
};

const createFtpAdapter = (isSecure: boolean): ConnectorUploadAdapter<FtpConnectorConfig> => ({
  defaults: {
    host: '',
    port: 21,
    username: '',
    password: '',
    secure: isSecure,
    pathPrefix: '/',
    fileNamePattern: DEFAULT_FILENAME_PATTERN,
    rejectUnauthorized: true,
    secureImplicit: false,
  },
  validate: (config) => {
    if (!config.host || !config.username || !config.password) {
      const protocol = isSecure ? 'FTPS' : 'FTP';
      return `${protocol} connector is not properly configured (missing host, username, or password)`;
    }
    return null;
  },
  createUploader: (config) => {
    const gw = new ConnectorFtpGw();
    gw.configure({ ...config, secure: isSecure });
    return (params) => gw.uploadFile(params);
  },
  getStoragePath: (resultData) => resultData.path,
});

// =============================================================================
// Generic Upload Function
// =============================================================================

const uploadFilesWithAdapter = async <TConfig extends Record<string, any>>(
  params: UploadToConnectorParams,
  adapter: ConnectorUploadAdapter<TConfig>,
): Promise<void> => {
  const { connector, form, submission, filesToUpload, uploadedFiles, failedFiles } = params;

  const connectorConfig = decryptConnectorConfig(connector);
  const config = parseOptions<TConfig>(connectorConfig, adapter.defaults);

  // Helper to fail all files with an error
  const failAllFiles = (error: string) => {
    for (const file of filesToUpload) {
      failedFiles.push({
        fieldName: file.fieldName,
        fileName: file.originalName,
        fileUrl: '',
        storagePath: '',
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        success: false,
        error,
      });
    }
  };

  // Validate configuration
  const validationError = adapter.validate(config);
  if (validationError) {
    failAllFiles(validationError);
    return;
  }

  // Additional validation if needed
  if (adapter.additionalValidation) {
    const additionalError = adapter.additionalValidation(config);
    if (additionalError) {
      failAllFiles(additionalError);
      return;
    }
  }

  // Create uploader
  const upload = adapter.createUploader(config);

  // Upload each file
  for (const file of filesToUpload) {
    try {
      const uploadResult = await upload({
        filePath: file.filePath,
        fileName: file.originalName,
        mimeType: file.mimeType,
        originalFileName: file.originalName,
        metadata: {
          requestId: submission.requestId,
          formId: form.id,
          formName: form.name,
        },
      });

      if (uploadResult.didSucceed()) {
        const resultData = uploadResult.getDataFirst();
        uploadedFiles.push({
          fieldName: file.fieldName,
          fileName: file.originalName,
          fileUrl: resultData.url,
          storagePath: adapter.getStoragePath(resultData),
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          success: true,
        });
      } else {
        failedFiles.push({
          fieldName: file.fieldName,
          fileName: file.originalName,
          fileUrl: '',
          storagePath: '',
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          success: false,
          error: uploadResult.getErrorSummary(),
        });
      }
    } catch (error: any) {
      failedFiles.push({
        fieldName: file.fieldName,
        fileName: file.originalName,
        fileUrl: '',
        storagePath: '',
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        success: false,
        error: error.message || 'Unknown error during file upload',
      });
    }
  }
};

// =============================================================================
// Main Upload Function
// =============================================================================

/**
 * Upload files to an external storage connector.
 * Supports: Azure Blob Storage, AWS S3, GCP Storage, FTP/FTPS
 */
export const uploadFilesWithConnector = async (
  params: UploadFilesWithConnectorParams,
): Promise<UploadFilesWithConnectorResult> => {
  const { connector, form, submission, formFiles } = params;

  const uploadedFiles: UploadedFileResult[] = [];
  const failedFiles: UploadedFileResult[] = [];

  // Flatten files from all fields into a single list with field context
  const filesToUpload: FileToUpload[] = [];

  for (const fieldName in formFiles) {
    const files = formFiles[fieldName];
    if (Array.isArray(files)) {
      for (const file of files) {
        filesToUpload.push({
          fieldName,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          filePath: file.path,
        });
      }
    }
  }

  if (filesToUpload.length === 0) {
    return {
      uploadedFiles: [],
      failedFiles: [],
      totalFiles: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  const baseParams: UploadToConnectorParams = {
    connector,
    form,
    submission,
    filesToUpload,
    uploadedFiles,
    failedFiles,
  };

  // Route to appropriate connector based on type
  switch (connector.connectorType) {
    case CONNECTOR_TYPES.AZURE_STORAGE_ACCOUNT_BLOB:
      await uploadFilesWithAdapter(baseParams, azureBlobAdapter);
      break;

    case CONNECTOR_TYPES.AWS_S3:
      await uploadFilesWithAdapter(baseParams, awsS3Adapter);
      break;

    case CONNECTOR_TYPES.GCP_STORAGE:
      await uploadFilesWithAdapter(baseParams, gcpStorageAdapter);
      break;

    case CONNECTOR_TYPES.FTP:
      await uploadFilesWithAdapter(baseParams, createFtpAdapter(false));
      break;

    case CONNECTOR_TYPES.FTPS:
      await uploadFilesWithAdapter(baseParams, createFtpAdapter(true));
      break;

    default:
      for (const file of filesToUpload) {
        failedFiles.push({
          fieldName: file.fieldName,
          fileName: file.originalName,
          fileUrl: '',
          storagePath: '',
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          success: false,
          error: `Connector type '${connector.connectorType}' does not support file uploads`,
        });
      }
      break;
  }

  return {
    uploadedFiles,
    failedFiles,
    totalFiles: filesToUpload.length,
    successCount: uploadedFiles.length,
    failureCount: failedFiles.length,
  };
};
