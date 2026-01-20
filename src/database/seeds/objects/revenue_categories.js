// ./src/database/seeds/objects/revenue_categories.js
const { revenueCategoriesWithKinds } = require('./revenueCategoriesAndKindsData');
const { STATUSES } = require('@sdflc/utils');

const seeds = revenueCategoriesWithKinds.map((category) => {
  return {
    id: category.id,
    order_no: category.orderNo,
    code: category.code,
    status: STATUSES.ACTIVE,
  };
});

module.exports = () => {
  return seeds;
};