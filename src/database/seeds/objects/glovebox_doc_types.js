const { gloveboxDocTypes } = require('./gloveboxDocTypesData');
const { STATUSES } = require('@sdflc/utils');

const seeds = gloveboxDocTypes.map((type, idx) => {
  return {
    id: type.id,
    code: type.code,
    category: type.category,
    order_no: (idx + 1) * 10,
    has_document_number: type.hasDocumentNumber ?? false,
    has_issue_date: type.hasIssueDate ?? false,
    has_effective_date: type.hasEffectiveDate ?? false,
    has_inspection_date: type.hasInspectionDate ?? false,
    has_expiration: type.hasExpiration ?? false,
    has_issuing_authority: type.hasIssuingAuthority ?? false,
    has_cost: type.hasCost ?? false,
    has_coverage_amount: type.hasCoverageAmount ?? false,
    has_phone: type.hasPhone ?? false,
    has_website: type.hasWebsite ?? false,
    document_number_label_key: type.documentNumberLabelKey || null,
    status: STATUSES.ACTIVE,
  };
});

module.exports = () => {
  return seeds;
};
