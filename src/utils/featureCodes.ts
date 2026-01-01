// ./src/utils/featureCodes.ts
// Feature codes constants to prevent typos
const FEATURE_CODES = {
  // Core features
  MAX_MONTH_SUBMISSIONS: 'max_month_submissions', // max submissions per month across all the forms
  MAX_FOMRS: 'max_forms', // max forms per account
  MAX_ACCOUNT_EMAILS: 'max_account_emails', // max account emails per account
  FILES_UPLOAD: 'files_upload',
  MAX_STORAGE_GB: 'max_storage_gb',
  MAX_FILE_SIZE_MB: 'max_file_size_mb', // max file size of an uploaded file
  MAX_CONNECTORS: 'max_connectors', // max connectors
  MAX_LOOKUP_DICTIONARIES: 'max_lookup_dictionaries', // max lookup dictionaries
  MAX_LOOKUP_DICTIONARY_ITEMS: 'max_lookup_dictionary_items', // max lookup items per dictionary
  EXTERNAL_LOOKUP_DICTIONARIES: 'external_lookup_dictionaries', // let's specify a http webhook for lookup
  FORM_SCHEDULING: 'form_scheduling', // true if form scheduling is enabled
  GEOFENCING: 'geofencing', // true if geofencing is enabled
  BYOE: 'byoe', // true if bring your own email is enabled (allows email layouts and templates)
  EMAIL_CONFIRMATIONS: 'email_confirmations', // true if email confirmations can be enabled
  MAX_CUSTOM_EMAIL_LAYOUTS: 'max_custom_email_layouts', // max number of custom email layouts
  MAX_CUSTOM_EMAIL_TEMPLATES: 'max_custom_email_templates', // max number of custom email templates
  BYOS: 'byos', // true if bring your own storage is enabled
  ARCHIVE_DAYS: 'archive_days', // number of days to keep submissions
  EXPORT_DATA: 'export_data', // true if exporting of data is enabled
  API_ACCESS: 'api_access', // level of api access: none, readonly, full

  MAX_WORKFLOWS: 'max_workflows', // max workflows per account
  MAX_WORKFLOW_ITEMS: 'max_workflow_items', // max workflow items per workflow

  VIRUS_SCANNING: 'virus_scanning', // virus scanning levels: none, basic, advanced
  HIPAA_BAA: 'hipaa_baa', // true if HIPAA BAA is enabled
  SOC2_COMPLIENCE: 'soc2_compliance', // true if HIPAA BAA is enabled

  MAX_USERS_QTY: 'max_users_qty', // max users per account
};

export {
  // Constants
  FEATURE_CODES,
};
