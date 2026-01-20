// ./src/database/seeds/objects/revenue_category_l_10_n.js
const { revenueCategoriesWithKinds } = require('./revenueCategoriesAndKindsData');

const seeds = revenueCategoriesWithKinds.reduce((acc, category) => {
  Object.keys(category.langs).forEach((lang) => {
    acc.push({
      id: `${category.id}-${lang}`,
      revenue_category_id: category.id,
      lang,
      name: category.langs[lang],
    });
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};