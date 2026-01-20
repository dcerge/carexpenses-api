// ./src/database/seeds/objects/revenue_kinds.js
const { revenueCategoriesWithKinds } = require('./revenueCategoriesAndKindsData');
const { STATUSES } = require('@sdflc/utils');

const seeds = revenueCategoriesWithKinds.reduce((acc, category) => {
  category.revenueKinds.forEach((kind) => {
    acc.push({
      id: kind.id,
      order_no: kind.orderNo,
      revenue_category_id: category.id,
      code: kind.code,
      status: STATUSES.ACTIVE,
    });
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};