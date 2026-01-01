const { vehicleMakes } = require('./vehicleMakesData');
const { STATUSES } = require('@sdflc/utils');

const seeds = vehicleMakes.reduce((acc, vehicleMake) => {
  acc.push({
    id: vehicleMake.id,
    make_name: vehicleMake.name,
    status: STATUSES.ACTIVE,
  });

  return acc;
}, []);

module.exports = () => {
  return seeds;
};
