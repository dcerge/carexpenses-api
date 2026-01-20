// ./src/database/seeds/objects/expense_category_l_10_n.js
const { expenseCategoriesWithKinds } = require('./expenseCategoriesAndKindsData');

const seeds = expenseCategoriesWithKinds.reduce((acc, type) => {
  Object.keys(type.langs).forEach((lang) => {
    acc.push({
      id: `${type.id}-${lang}`,
      expense_category_id: type.id,
      lang,
      name: type.langs[lang],
    });
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};
