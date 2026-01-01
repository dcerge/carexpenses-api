import { localEncryptionService } from './LocalEncryptionService';

export const decryptConnectorConfig = (connector: any): string => {
  let configuration = connector.connectorConfiguration;

  if (configuration && connector.accountId) {
    try {
      if (localEncryptionService.isEncrypted(configuration)) {
        configuration = localEncryptionService.decrypt(configuration, connector.accountId);
      }
    } catch (error) {
      console.error(`Failed to decrypt connector config for connector ${connector.id}:`, error);
    }
  }

  return configuration;
};
