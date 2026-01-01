const { serviceIntervalDefaults } = require('./serviceIntervalDefaultsData');
const { STATUSES } = require('@sdflc/utils');

const seeds = serviceIntervalDefaults.map((expenseInterval, idx) => {
  return {
    id: 1 + idx,
    kindId: expenseInterval.kindId,
    intervalType: expenseInterval.intervalType,
    mileageInterval: expenseInterval.mileageInterval,
    daysInterval: expenseInterval.daysInterval,
    status: STATUSES.ACTIVE,
  };
});

module.exports = () => {
  return seeds;
};
