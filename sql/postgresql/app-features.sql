-- Clear existing features first
DELETE FROM ms_auth.app_features WHERE space_id = 'formsubmits';

-- Insert condensed features for all plans
INSERT INTO ms_auth.app_features (space_id, order_no, feature_code, feature_name, feature_description, feature_icon, addon_type, max_addons, feature_value_type, feature_default_value, status, version, created_by, updated_by, removed_by, created_at, updated_at, removed_at, removed_at_str) VALUES
	-- Core Limits
	('formsubmits', 1000, 'max_month_submissions', 'Monthly Submissions', 'Maximum submissions per month', NULL, 'NONE', NULL, 'integer', '200', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 1001, 'max_forms', 'Total Forms', 'Maximum number of forms (null = unlimited)', NULL, 'NONE', NULL, 'integer', '3', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 1002, 'max_users', 'Team Members', 'Maximum users per account (null = unlimited)', NULL, 'NONE', NULL, 'integer', '1', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- File Upload Features
	('formsubmits', 2000, 'files_upload', 'File Uploads', 'Allow file uploads', NULL, 'NONE', NULL, 'boolean', 'false', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 2001, 'max_storage_gb', 'Storage (GB)', 'File storage in gigabytes (0 = none, null = unlimited/custom)', NULL, 'NONE', NULL, 'integer', '0', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 2002, 'max_file_size_mb', 'Max File Size (MB)', 'Maximum file size per submission in MB (null = custom)', NULL, 'NONE', NULL, 'integer', '0', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- Integrations & Connectors
	('formsubmits', 3000, 'max_connectors', 'Total Connectors', 'Maximum number of connectors (null = unlimited)', NULL, 'NONE', NULL, 'integer', '1', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- Lookup Dictionaries
	('formsubmits', 4000, 'max_lookup_dictionaries', 'Lookup Dictionaries', 'Maximum number of lookup dictionaries (null = unlimited)', NULL, 'NONE', NULL, 'integer', '1', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 4001, 'max_lookup_dictionary_records', 'Records Per Dictionary', 'Maximum records per lookup dictionary (null = unlimited)', NULL, 'NONE', NULL, 'integer', '100', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- Form Features
	('formsubmits', 5000, 'form_scheduling', 'Form Scheduling', 'Enable form scheduling by date/time', NULL, 'NONE', NULL, 'boolean', 'true', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 5001, 'geofencing', 'Geofencing', 'Geographic restrictions for submissions', NULL, 'NONE', NULL, 'boolean', 'false', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- Email Features
	('formsubmits', 6000, 'byoe', 'BYOE (Bring Your Own Email)', 'Use custom SendGrid/SMTP for emails', NULL, 'NONE', NULL, 'boolean', 'false', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 6001, 'email_confirmations', 'Email Confirmations', 'Send confirmation emails to submitters (requires BYOE)', NULL, 'NONE', NULL, 'boolean', 'false', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 6002, 'max_custom_email_layouts', 'Custom Email Layouts', 'Number of custom email layouts (0 = default only, null = unlimited)', NULL, 'NONE', NULL, 'integer', '0', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 6003, 'max_custom_email_templates', 'Custom Email Templates', 'Number of custom email templates (0 = default only, null = unlimited)', NULL, 'NONE', NULL, 'integer', '0', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- Storage Features
	('formsubmits', 7000, 'byos', 'BYOS (Bring Your Own Storage)', 'Use AWS/Azure/GCP/FTP for file storage', NULL, 'NONE', NULL, 'boolean', 'false', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- Data Management
	('formsubmits', 8000, 'archive_days', 'Submission Archive (Days)', 'Days to keep submission data (0 = forever, null = custom)', NULL, 'NONE', NULL, 'integer', '30', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 8001, 'export_data', 'Export Data', 'Export submissions as CSV/PDF', NULL, 'NONE', NULL, 'boolean', 'true', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 8002, 'api_access', 'API Access', 'API access level: none, readonly, full', NULL, 'NONE', NULL, 'string', 'none', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- Workflows
	('formsubmits', 9000, 'max_workflows', 'Workflows', 'Maximum number of workflows (0 = none, null = unlimited)', NULL, 'NONE', NULL, 'integer', '0', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- Security Features
	('formsubmits', 10000, 'virus_scanning', 'Virus Scanning', 'Virus scanning level: none, basic, advanced', NULL, 'NONE', NULL, 'string', 'none', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- Service Level
	('formsubmits', 11000, 'sla_percentage', 'SLA Uptime %', 'Guaranteed uptime SLA percentage (null = no SLA)', NULL, 'NONE', NULL, 'decimal', NULL, 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	
	-- Compliance
	('formsubmits', 12000, 'hipaa_baa', 'HIPAA BAA', 'HIPAA Business Associate Agreement available', NULL, 'NONE', NULL, 'boolean', 'false', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('formsubmits', 12001, 'soc2_compliance', 'SOC 2 Compliance', 'SOC 2 compliance certification', NULL, 'NONE', NULL, 'boolean', 'false', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, '');