-- Clear existing features first
DELETE FROM ms_auth.app_features WHERE space_id = 'carexpenses';

-- Insert condensed features for all plans
INSERT INTO ms_auth.app_features (space_id, order_no, feature_code, feature_name, feature_description, feature_icon, addon_type, max_addons, feature_value_type, feature_default_value, status, version, created_by, updated_by, removed_by, created_at, updated_at, removed_at, removed_at_str) VALUES
	-- Core Limits
	('carexpenses', 1000, 'max_vehicles', 'Total Vehicles', 'Maximum active vehicles you can add', NULL, 'NONE', NULL, 'integer', '1', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('carexpenses', 1001, 'storage_mb', 'Storage, MB', 'Maximum storage for your documents', NULL, 'NONE', NULL, 'integer', '3', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, ''),
	('carexpenses', 1002, 'max_users_qty', 'Max Users', 'Maximum users per account', NULL, 'NONE', NULL, 'integer', '1', 100, 0, NULL, NULL, NULL, NOW(), NOW(), NULL, '');