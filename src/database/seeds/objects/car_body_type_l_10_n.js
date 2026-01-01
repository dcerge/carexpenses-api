const { carBodyTypes } = require('./carBodyTypesData');
const { STATUSES } = require('@sdflc/utils');

const seeds = carBodyTypes.reduce((acc, type) => {
  Object.keys(type.langs).forEach((lang) => {
    acc.push({
      id: `${type.id}-${lang}`,
      car_body_type_id: type.id,
      lang,
      name: type.langs[lang],
    });
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};
