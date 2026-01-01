const { carTransmissionTypes } = require('./carTransmissionTypesData');
const { STATUSES } = require('@sdflc/utils');

const seeds = carTransmissionTypes.reduce((acc, type) => {
  Object.keys(type.langs).forEach((lang) => {
    acc.push({
      id: `${type.id}-${lang}`,
      car_transmission_type_id: type.id,
      lang,
      name: type.langs[lang],
    });
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};
