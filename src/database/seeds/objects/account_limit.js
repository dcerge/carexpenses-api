const { defaultFields } = require('@sdflc/backend-helpers');

const accountLimits = [
  {
    spaceId: 'develop',
    accountId: '00000000-0000-4000-9000-000000000000',
    userId: '00000000-0000-4000-9000-000000000001',
    maxFileSizeBytes: 1024 * 1024 * 5,
    maxSizeMb: 5,
  },
];

module.exports = () => {
  return accountLimits.map((accountLimit) => {
    return {
      ...accountLimit,
      ...defaultFields({}),
    };
  });
};
