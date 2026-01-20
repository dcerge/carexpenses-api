// ./src/database/seeds/objects/expense_kind_l_10_n.js
const { expenseCategoriesWithKinds } = require('./expenseCategoriesAndKindsData');

const seeds = expenseCategoriesWithKinds.reduce((acc, category) => {
  category.expenseKinds.forEach((kind) => {
    Object.keys(kind.langs).forEach((lang) => {
      acc.push({
        id: `${kind.id}-${lang}`,
        expense_kind_id: kind.id,
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
