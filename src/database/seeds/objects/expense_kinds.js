// ./src/database/seeds/objects/expense_kinds.js
const { expenseCategoriesWithKinds } = require('./expenseCategoriesAndKindsData');
const { STATUSES } = require('@sdflc/utils');

const seeds = expenseCategoriesWithKinds.reduce((acc, category) => {
  category.expenseKinds.forEach((kind) => {
    acc.push({
      id: kind.id,
      order_no: kind.orderNo,
      expense_category_id: category.id,
      code: kind.code,
      canSchedule: kind.canSchedule,
      isItMaintenance: kind.isMaintenance,
      status: STATUSES.ACTIVE,
    });
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};
