// ./src/database/seeds/objects/tire_brands.js
const { tireBrands } = require('./tireBrandsData');
const { STATUSES } = require('@sdflc/utils');

const seeds = tireBrands.reduce((acc, tireBrand) => {
  acc.push({
    id: tireBrand.id,
    name: tireBrand.name,
    website: tireBrand.website,
    status: STATUSES.ACTIVE,
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};
