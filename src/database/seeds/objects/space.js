const { defaultFields } = require('@sdflc/backend-helpers');

const spaces = [
  {
    id: 'develop',
    name: 'Develop Space',
    requestsPerMin: 100,
    lockForMin: 5,
    allowedIpAddresses: '',
    apiKey: 'APIKEY1!',
    managementApiKey: 'APIKEY2!',
    tokenSecret:
      'MbA3ifFX6WY1qf-KWK9H19vefzdyVDIsh4f656GsmGtT6H8a8VVme9MZ_F38ZNhlEjjMaZl2_-p0fFujZ-rY62d4SIaGklcHZvvSSy-n8v2-Mh6m6D2XeX4ayuSvjsGF',
    storageProvider: 'google-cloud-storage',
    storageAccount: 'microservices-set;***',
    storageProviderCredentials: '',
    storageDomain: '',
    storageCdnDomain: '',
    maxFileSizeBytes: 1024 * 1024 * 5,
    maxSizeMb: 100,
    notificationEmail: '',
    cookieName: 'jt',
    fingerprintCookieName: 'ft',
    notes: '',
  },
];

module.exports = () => {
  return spaces.map((space) => {
    return {
      ...space,
      ...defaultFields({}),
    };
  });
};
