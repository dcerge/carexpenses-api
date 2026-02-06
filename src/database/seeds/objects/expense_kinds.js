// ./src/database/seeds/objects/expense_kinds.js
const { expenseCategoriesWithKinds, getOrderNo } = require('./expenseCategoriesAndKindsData');
const { STATUSES } = require('@sdflc/utils');

const seeds = expenseCategoriesWithKinds.reduce((acc, category) => {
  category.expenseKinds.forEach((kind, idx) => {
    acc.push({
      id: kind.id,
      order_no: getOrderNo(kind, idx),
      expense_category_id: category.id,
      code: kind.code,
      canSchedule: kind.canSchedule ?? false,
      isItMaintenance: kind.isMaintenance ?? false,
      status: STATUSES.ACTIVE,
    });
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};
