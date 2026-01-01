const { expenseCategoriesWithKinds } = require('./expenseCategoriesAndKindsData');
const { STATUSES } = require('@sdflc/utils');

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
