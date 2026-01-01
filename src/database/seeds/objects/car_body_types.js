const { carBodyTypes } = require('./carBodyTypesData');
const { STATUSES } = require('@sdflc/utils');

const seeds = carBodyTypes.map((type) => {
  return {
    id: type.id,
    order_no: type.orderNo,
    code: type.code,
    status: STATUSES.ACTIVE,
  };
});

module.exports = () => {
  return seeds;
};
