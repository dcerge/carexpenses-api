// ./src/database/seeds/objects/expense_categories.js
const { expenseCategoriesWithKinds, getOrderNo } = require('./expenseCategoriesAndKindsData');
const { STATUSES } = require('@sdflc/utils');

const seeds = expenseCategoriesWithKinds.map((type, idx) => {
  return {
    id: type.id,
    order_no: getOrderNo(type, idx),
    code: type.code,
    status: STATUSES.ACTIVE,
  };
});

module.exports = () => {
  return seeds;
};
