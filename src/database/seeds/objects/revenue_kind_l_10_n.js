// ./src/database/seeds/objects/revenue_kind_l_10_n.js
const { revenueCategoriesWithKinds } = require('./revenueCategoriesAndKindsData');

const seeds = revenueCategoriesWithKinds.reduce((acc, category) => {
  category.revenueKinds.forEach((kind) => {
    Object.keys(kind.langs).forEach((lang) => {
      acc.push({
        id: `${kind.id}-${lang}`,
        revenue_kind_id: kind.id,
        lang,
        name: kind.langs[lang],
        description: '',
      });
    });
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};