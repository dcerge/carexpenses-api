// ./src/database/helpers.ts
import { FIELDS as STANDARD_FIELDS } from '@sdflc/backend-helpers';
import config from '../config';

export const dbNewId = config.dbType === 'pg' ? 'uuid_generate_v4()' : 'NEWSEQUENTIALID()';
export const sqlLike = config.dbType === 'pg' ? 'ilike' : 'like';

export const SYSTEM_ACCOUNT_ID = '00000000-0000-0000-0000-000000000000';

// =============================================================================
// TABLE NAMES
// =============================================================================

export const TABLES = {
  // ---------------------------------------------------------------------------
  // Lookup Tables (Static Reference Data)
  // ---------------------------------------------------------------------------
  CAR_BODY_TYPES: 'car_body_types',
  CAR_BODY_TYPE_L10N: 'car_body_type_l10n',
  CAR_ENGINE_TYPES: 'car_engine_types',
  CAR_ENGINE_TYPE_L10N: 'car_engine_type_l10n',
  CAR_TRANSMISSION_TYPES: 'car_transmission_types',
  CAR_TRANSMISSION_TYPE_L10N: 'car_transmission_type_l10n',
  VEHICLE_MAKES: 'vehicle_makes',
  EXPENSE_CATEGORIES: 'expense_categories',
  EXPENSE_CATEGORY_L10N: 'expense_category_l10n',
  EXPENSE_KINDS: 'expense_kinds',
  EXPENSE_KIND_L10N: 'expense_kind_l10n',
  SERVICE_INTERVAL_DEFAULTS: 'service_interval_defaults',

  // ---------------------------------------------------------------------------
  // User-Level Data
  // ---------------------------------------------------------------------------
  USER_PROFILES: 'user_profiles',
  EXPENSE_LABELS: 'expense_labels',
  EXPENSE_TAGS: 'expense_tags',

  // ---------------------------------------------------------------------------
  // Core Entities
  // ---------------------------------------------------------------------------
  CARS: 'cars',
  USER_CARS: 'user_cars',
  TRAVELS: 'travels',

  // ---------------------------------------------------------------------------
  // Expense System
  // ---------------------------------------------------------------------------
  EXPENSE_BASES: 'expense_bases',
  EXPENSES: 'expenses',
  REFUELS: 'refuels',

  // ---------------------------------------------------------------------------
  // Junction/Relationship Tables
  // ---------------------------------------------------------------------------
  EXPENSE_EXPENSE_TAGS: 'expense_expense_tags',
  TRAVEL_EXPENSE_TAGS: 'travel_expense_tags',

  // ---------------------------------------------------------------------------
  // Attachments
  // ---------------------------------------------------------------------------
  ENTITY_ATTACHMENTS: 'entity_attachments',
  ENTITY_ENTITY_ATTACHMENTS: 'entity_entity_attachments',

  // ---------------------------------------------------------------------------
  // Summary/Aggregate Tables
  // ---------------------------------------------------------------------------
  CAR_TOTAL_SUMMARIES: 'car_total_summaries',
  CAR_TOTAL_EXPENSES: 'car_total_expenses',
  CAR_MONTHLY_SUMMARIES: 'car_monthly_summaries',
  CAR_MONTHLY_EXPENSES: 'car_monthly_expenses',

  // ---------------------------------------------------------------------------
  // Service Intervals
  // ---------------------------------------------------------------------------
  SERVICE_INTERVAL_ACCOUNTS: 'service_interval_accounts',
  SERVICE_INTERVAL_NEXTS: 'service_interval_nexts',

  // ---------------------------------------------------------------------------
  // Sharing & Transfer
  // ---------------------------------------------------------------------------
  CAR_SHARES: 'car_shares',
  CAR_TRANSFERS: 'car_transfers',

  // ---------------------------------------------------------------------------
  // Notifications & Tasks
  // ---------------------------------------------------------------------------
  USER_NOTIFICATIONS: 'user_notifications',
  QUEUED_TASKS: 'queued_tasks',
  SMS_HISTORY_ITEMS: 'sms_history_items',
};

// =============================================================================
// FIELD NAMES
// =============================================================================

export const FIELDS = {
  ...STANDARD_FIELDS,

  ORIG_ID: 'orig_id',

  // ---------------------------------------------------------------------------
  // Common Fields (used across multiple tables)
  // ---------------------------------------------------------------------------
  UID: 'uid',
  ACCOUNT_ID: 'account_id',
  USER_ID: 'user_id',
  CAR_ID: 'car_id',
  STATUS: 'status',
  ORDER_NO: 'order_no',
  CODE: 'code',
  NAME: 'name',
  NORMALIZED_NAME: 'normalized_name',
  DESCRIPTION: 'description',
  COMMENTS: 'comments',
  LANGUAGE_CODE: 'language_code',
  REMOVED_AT_STR: 'removed_at_str',

  // ---------------------------------------------------------------------------
  // Lookup Table Fields
  // ---------------------------------------------------------------------------
  // Car Body Type
  CAR_BODY_TYPE_ID: 'car_body_type_id',

  // Car Engine Type
  CAR_ENGINE_TYPE_ID: 'car_engine_type_id',

  // Car Transmission Type
  CAR_TRANSMISSION_TYPE_ID: 'car_transmission_type_id',

  // Vehicle Make
  MAKE_ID: 'make_id',
  MAKE_NAME: 'make_name',

  // Expense Category
  EXPENSE_CATEGORY_ID: 'expense_category_id',

  // Expense Kind
  EXPENSE_KIND_ID: 'expense_kind_id',
  CAN_SCHEDULE: 'can_schedule',
  IS_IT_MAINTENANCE: 'is_it_maintenance',

  // Service Interval Defaults
  KIND_ID: 'kind_id',
  INTERVAL_TYPE: 'interval_type',
  MILEAGE_INTERVAL: 'mileage_interval',
  DAYS_INTERVAL: 'days_interval',

  // ---------------------------------------------------------------------------
  // User Profile Fields
  // ---------------------------------------------------------------------------
  HOME_CURRENCY: 'home_currency',
  DISTANCE_IN: 'distance_in',
  VOLUME_IN: 'volume_in',
  CONSUMPTION_IN: 'consumption_in',
  NOTIFY_IN_MILEAGE: 'notify_in_mileage',
  NOTIFY_IN_DAYS: 'notify_in_days',

  // ---------------------------------------------------------------------------
  // Expense Label Fields
  // ---------------------------------------------------------------------------
  LABEL_ID: 'label_id',
  LABEL_NAME: 'label_name',
  LABEL_COLOR: 'label_color',
  LAST_TIME_USED: 'last_time_used',

  // ---------------------------------------------------------------------------
  // Expense Tag Fields
  // ---------------------------------------------------------------------------
  EXPENSE_TAG_ID: 'expense_tag_id',
  TAG_NAME: 'tag_name',
  TAG_COLOR: 'tag_color',

  // ---------------------------------------------------------------------------
  // Car Fields
  // ---------------------------------------------------------------------------
  LABEL: 'label',
  VIN: 'vin',
  MAKE: 'make',
  MODEL: 'model',
  COLOR: 'color',
  BODY_TYPE: 'body_type',
  TRANSMISSION: 'transmission',
  ENGINE_VOLUME: 'engine_volume',
  MANUFACTURED_IN: 'manufactured_in',
  MILEAGE_IN: 'mileage_in',
  INITIAL_MILEAGE: 'initial_mileage',
  TYPE_OF_FUEL: 'type_of_fuel',
  TANK_VOLUME: 'tank_volume',
  ADDITIONAL_TANK_VOLUME: 'additional_tank_volume',
  WHEN_BOUGHT: 'when_bought',
  BOUGHT_FOR: 'bought_for',
  BOUGHT_FOR_CURRENCY: 'bought_for_currency',
  BOUGHT_FROM: 'bought_from',
  WHEN_SOLD: 'when_sold',
  SOLD_FOR: 'sold_for',
  SOLD_FOR_CURRENCY: 'sold_for_currency',
  SOLD_TO: 'sold_to',
  BODY_TYPE_ID: 'body_type_id',
  TRANSMISSION_TYPE_ID: 'transmission_type_id',
  ENGINE_TYPE_ID: 'engine_type_id',
  FIRST_RECORD_ID: 'first_record_id',
  OWNER_NUMBER: 'owner_number',
  ENTITY_ATTACHMENT_ID: 'entity_attachment_id',

  // ---------------------------------------------------------------------------
  // User Car Fields
  // ---------------------------------------------------------------------------
  ROLE_ID: 'role_id',

  // ---------------------------------------------------------------------------
  // Travel Fields
  // ---------------------------------------------------------------------------
  TRAVEL_ID: 'travel_id',
  IS_ACTIVE: 'is_active',
  FIRST_ODOMETER: 'first_odometer',
  LAST_ODOMETER: 'last_odometer',
  LAST_RECORD_ID: 'last_record_id',
  FIRST_DTTM: 'first_dttm',
  LAST_DTTM: 'last_dttm',
  PURPOSE: 'purpose',
  DESTINATION: 'destination',

  // ---------------------------------------------------------------------------
  // Expense Base Fields
  // ---------------------------------------------------------------------------
  EXPENSE_ID: 'expense_id',
  EXPENSE_TYPE: 'expense_type',
  ODOMETER: 'odometer',
  TRIP_METER: 'trip_meter',
  WHEN_DONE: 'when_done',
  LOCATION: 'location',
  WHERE_DONE: 'where_done',
  TOTAL_PRICE: 'total_price',
  PAID_IN_CURRENCY: 'paid_in_currency',
  TOTAL_PRICE_IN_HC: 'total_price_in_hc',
  EXPENSE_PICTURE_ID: 'expense_picture_id',
  FUEL_IN_TANK: 'fuel_in_tank',
  SUBTOTAL: 'subtototal',
  TAX: 'tax',
  FEES: 'fees',
  REFUELS_TAXES: 'refuel_taxes',
  EXPENSES_TAXES: 'expenses_taxes',
  EXPENSES_FEES: 'expenses_fees',

  // ---------------------------------------------------------------------------
  // Expense Fields
  // ---------------------------------------------------------------------------
  COST_WORK: 'cost_work',
  COST_PARTS: 'cost_parts',
  COST_WORK_HC: 'cost_work_hc',
  COST_PARTS_HC: 'cost_parts_hc',
  SHORT_NOTE: 'short_note',

  // ---------------------------------------------------------------------------
  // Refuel Fields
  // ---------------------------------------------------------------------------
  REFUEL_VOLUME: 'refuel_volume',
  VOLUME_ENTERED_IN: 'volume_entered_in',
  PRICE_PER_VOLUME: 'price_per_volume',
  IS_FULL_TANK: 'is_full_tank',
  REMAINING_IN_TANK_BEFORE: 'remaining_in_tank_before',
  FUEL_GRADE: 'fuel_grade',

  // ---------------------------------------------------------------------------
  // Entity Attachment Fields
  // ---------------------------------------------------------------------------
  ATTACHMENT_TYPE: 'attachment_type',
  ATTACHMENT_PATH: 'attachment_path',
  ATTACHMENT_SIZE: 'attachment_size',
  ACCESS_LEVEL: 'access_level',
  FOR_ENTITY_TYPE_ID: 'for_entity_type_id',
  COORDINATES: 'coordinates',
  UPLOADED_FILE_ID: 'uploaded_file_id',

  // ---------------------------------------------------------------------------
  // Entity Entity Attachment Fields
  // ---------------------------------------------------------------------------
  ENTITY_TYPE_ID: 'entity_type_id',
  ENTITY_ID: 'entity_id',

  // ---------------------------------------------------------------------------
  // Car Total Summary Fields
  // ---------------------------------------------------------------------------
  LATEST_KNOWN_MILEAGE: 'latest_known_mileage',
  LATEST_REFUEL_ID: 'latest_refuel_id',
  LATEST_EXPENSE_ID: 'latest_expense_id',
  LATEST_TRAVEL_ID: 'latest_travel_id',
  TOTAL_REFUELS_COUNT: 'total_refuels_count',
  TOTAL_EXPENSES_COUNT: 'total_expenses_count',
  TOTAL_REFUELS_COST: 'total_refuels_cost',
  TOTAL_EXPENSES_COST: 'total_expenses_cost',
  TOTAL_REFUELS_VOLUME: 'total_refuels_volume',
  FIRST_RECORD_AT: 'first_record_at',
  LAST_RECORD_AT: 'last_record_at',

  // ---------------------------------------------------------------------------
  // Car Total Expense Fields
  // ---------------------------------------------------------------------------
  RECORDS_COUNT: 'records_count',
  AMOUNT: 'amount',

  // ---------------------------------------------------------------------------
  // Car Monthly Summary Fields
  // ---------------------------------------------------------------------------
  CAR_MONTHLY_SUMMARY_ID: 'car_monthly_summary_id',
  YEAR: 'year',
  MONTH: 'month',
  START_MILEAGE: 'start_mileage',
  END_MILEAGE: 'end_mileage',
  REFUELS_COUNT: 'refuels_count',
  EXPENSES_COUNT: 'expenses_count',
  REFUELS_COST: 'refuels_cost',
  EXPENSES_COST: 'expenses_cost',
  REFUELS_VOLUME: 'refuels_volume',

  // ---------------------------------------------------------------------------
  // Service Interval Fields
  // ---------------------------------------------------------------------------
  MAX_WHEN_DONE: 'max_when_done',
  MAX_ODOMETER: 'max_odometer',
  NEXT_WHEN_DO: 'next_when_do',
  NEXT_ODOMETER: 'next_odometer',

  // ---------------------------------------------------------------------------
  // Car Share Fields
  // ---------------------------------------------------------------------------
  WHAT_TO_SHARE: 'what_to_share',
  WHEN_SENT: 'when_sent',
  FROM_USER_ID: 'from_user_id',
  TO_USER_ID: 'to_user_id',
  FROM_USER_NAME: 'from_user_name',
  TO_USER_NAME: 'to_user_name',
  SHARE_ROLE_ID: 'share_role_id',
  SHARE_STATUS: 'share_status',
  STATUS_DATE: 'status_date',

  // ---------------------------------------------------------------------------
  // Car Transfer Fields
  // ---------------------------------------------------------------------------
  WHAT_TO_TRANSFER: 'what_to_transfer',
  TRANSFER_STATUS: 'transfer_status',
  NEW_CAR_ID: 'new_car_id',

  // ---------------------------------------------------------------------------
  // User Notification Fields
  // ---------------------------------------------------------------------------
  ENTITY_ORIG_ID: 'entity_orig_id',
  ENTITY_UID: 'entity_uid',
  READ_AT: 'read_at',
  NOTIFICATION_TYPE: 'notification_type',
  MESSAGE: 'message',
  SENDER: 'sender',
  ACTION_INFO: 'action_info',

  // ---------------------------------------------------------------------------
  // Queued Task Fields
  // ---------------------------------------------------------------------------
  TASK_TYPE: 'task_type',
  TASK_STATUS: 'task_status',
  TASK_INFO: 'task_info',

  // ---------------------------------------------------------------------------
  // SMS History Fields
  // ---------------------------------------------------------------------------
  SID: 'sid',
  MESSAGE_DTTM: 'message_dttm',
  DIRECTION: 'direction',
  FROM_NUMBER: 'from_number',
  TO_NUMBER: 'to_number',
  BODY: 'body',
  METADATA: 'metadata',
};

// =============================================================================
// STATUS VALUES
// =============================================================================

export const STATUS = {
  ACTIVE: 100,
  INACTIVE: 200,
  DELETED: 300,
  PENDING: 400,
  ARCHIVED: 500,
};

// =============================================================================
// EXPENSE TYPES
// =============================================================================

export const EXPENSE_TYPES = {
  REFUEL: 1,
  EXPENSE: 2,
};

// =============================================================================
// SHARE STATUS VALUES
// =============================================================================

export const SHARE_STATUS = {
  PENDING: 1,
  ACCEPTED: 2,
  REJECTED: 3,
  CANCELLED: 4,
};

// =============================================================================
// TRANSFER STATUS VALUES
// =============================================================================

export const TRANSFER_STATUS = {
  PENDING: 1,
  ACCEPTED: 2,
  REJECTED: 3,
  CANCELLED: 4,
};

// =============================================================================
// TASK STATUS VALUES
// =============================================================================

export const TASK_STATUS = {
  PENDING: 1,
  PROCESSING: 2,
  COMPLETED: 3,
  FAILED: 4,
};

// =============================================================================
// TASK TYPES
// =============================================================================

export const TASK_TYPES = {
  RECALCULATE_SUMMARIES: 1,
  EXPORT_DATA: 2,
  IMPORT_DATA: 3,
};

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export const NOTIFICATION_TYPES = {
  CAR_SHARED: 1,
  CAR_TRANSFER_REQUEST: 2,
  SERVICE_REMINDER: 3,
  SHARE_ACCEPTED: 4,
  SHARE_REJECTED: 5,
  TRANSFER_ACCEPTED: 6,
  TRANSFER_REJECTED: 7,
};

// =============================================================================
// SMS DIRECTION
// =============================================================================

export const SMS_DIRECTION = {
  INBOUND: 1,
  OUTBOUND: 2,
};

// =============================================================================
// INTERVAL TYPES
// =============================================================================

export const INTERVAL_TYPES = {
  MILEAGE_ONLY: 1,
  DAYS_ONLY: 2,
  MILEAGE_OR_DAYS: 3,
  MILEAGE_AND_DAYS: 4,
};

// =============================================================================
// ACCESS LEVELS
// =============================================================================

export const ACCESS_LEVELS = {
  PRIVATE: 1,
  SHARED: 2,
  PUBLIC: 3,
};

// =============================================================================
// ENTITY TYPES (for attachments)
// =============================================================================

export const ENTITY_TYPES = {
  CAR: 1,
  EXPENSE: 2,
  REFUEL: 3,
  TRAVEL: 4,
};

// =============================================================================
// USER CAR ROLES
// =============================================================================

export const USER_CAR_ROLES = {
  OWNER: 1,
  EDITOR: 2,
  VIEWER: 3,
};
