const { gloveboxDocTypes } = require('./gloveboxDocTypesData');
const { STATUSES } = require('@sdflc/utils');

const seeds = gloveboxDocTypes.map((type) => {
  return {
    id: type.id,
    code: type.code,
    category: type.category,
    order_no: type.orderNo,
    has_document_number: type.hasDocumentNumber,
    has_issue_date: type.hasIssueDate,
    has_effective_date: type.hasEffectiveDate,
    has_expiration: type.hasExpiration,
    has_issuing_authority: type.hasIssuingAuthority,
    has_cost: type.hasCost,
    has_coverage_amount: type.hasCoverageAmount,
    document_number_label_key: type.documentNumberLabelKey || null,
    status: STATUSES.ACTIVE,
  };
});

module.exports = () => {
  return seeds;
};
