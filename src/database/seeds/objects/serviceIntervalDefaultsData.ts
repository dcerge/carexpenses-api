// Interval type enum
export const IntervalType = {
  NONE: 0,
  MILEAGE: 1,
  DAYS: 2,
  BOTH: 3,
} as const;

export type IntervalTypeValue = (typeof IntervalType)[keyof typeof IntervalType];

export const serviceIntervalDefaults: any[] = [
  {
    kindId: 1,
    kindCode: 'ENGINE_OIL_FILTER_CHANGE',
    intervalType: IntervalType.BOTH,
    mileageInterval: 7000,
    daysInterval: 180,
  },
  {
    kindId: 2,
    kindCode: 'PLANNED_PARTS_REPLACEMENT',
    intervalType: IntervalType.NONE,
    mileageInterval: 0,
    daysInterval: 0,
  },
  {
    kindId: 3,
    kindCode: 'CONSUMABLES_PURCHASE',
    intervalType: IntervalType.NONE,
    mileageInterval: 0,
    daysInterval: 0,
  },
  {
    kindId: 4,
    kindCode: 'WHEEL_ALIGNMENT',
    intervalType: IntervalType.MILEAGE,
    mileageInterval: 10000,
    daysInterval: 0,
  },
  {
    kindId: 5,
    kindCode: 'ELECTRONICS_DIAGNOSTIC',
    intervalType: IntervalType.NONE,
    mileageInterval: 0,
    daysInterval: 0,
  },
  {
    kindId: 6,
    kindCode: 'UNDERCARRIAGE_DIAGNOSTIC',
    intervalType: IntervalType.MILEAGE,
    mileageInterval: 10000,
    daysInterval: 0,
  },
  {
    kindId: 7,
    kindCode: 'TRANSMISSION_OIL_CHANGE',
    intervalType: IntervalType.BOTH,
    mileageInterval: 100000,
    daysInterval: 1800,
  },
  {
    kindId: 8,
    kindCode: 'BRAKE_FLUID_CHANGE',
    intervalType: IntervalType.BOTH,
    mileageInterval: 60000,
    daysInterval: 1080,
  },
  {
    kindId: 9,
    kindCode: 'ANTIFREEZE_CHANGE',
    intervalType: IntervalType.BOTH,
    mileageInterval: 60000,
    daysInterval: 1080,
  },
  {
    kindId: 10,
    kindCode: 'ALTERNATOR_BELT_REPLACEMENT',
    intervalType: IntervalType.BOTH,
    mileageInterval: 60000,
    daysInterval: 1080,
  },
  {
    kindId: 11,
    kindCode: 'TIMING_BELT_REPLACEMENT',
    intervalType: IntervalType.BOTH,
    mileageInterval: 60000,
    daysInterval: 1080,
  },
  {
    kindId: 12,
    kindCode: 'REAR_BRAKE_PADS_REPLACEMENT',
    intervalType: IntervalType.BOTH,
    mileageInterval: 30000,
    daysInterval: 1080,
  },
  {
    kindId: 13,
    kindCode: 'FRONT_BRAKE_PADS_REPLACEMENT',
    intervalType: IntervalType.BOTH,
    mileageInterval: 30000,
    daysInterval: 1080,
  },
  {
    kindId: 14,
    kindCode: 'FULL_BRAKES_CHANGE',
    intervalType: IntervalType.NONE,
    mileageInterval: 0,
    daysInterval: 0,
  },
  {
    kindId: 15,
    kindCode: 'FRONT_ROTORS_PADS_CHANGE',
    intervalType: IntervalType.NONE,
    mileageInterval: 0,
    daysInterval: 0,
  },
  {
    kindId: 16,
    kindCode: 'REAR_ROTORS_PADS_CHANGE',
    intervalType: IntervalType.NONE,
    mileageInterval: 0,
    daysInterval: 0,
  },
  {
    kindId: 17,
    kindCode: 'CABIN_FILTER_REPLACEMENT',
    intervalType: IntervalType.BOTH,
    mileageInterval: 30000,
    daysInterval: 720,
  },
  {
    kindId: 18,
    kindCode: 'AIR_FILTER_REPLACEMENT',
    intervalType: IntervalType.BOTH,
    mileageInterval: 30000,
    daysInterval: 720,
  },
  {
    kindId: 19,
    kindCode: 'FUEL_FILTER_REPLACEMENT',
    intervalType: IntervalType.BOTH,
    mileageInterval: 30000,
    daysInterval: 720,
  },
  {
    kindId: 20,
    kindCode: 'SPARK_PLUGS_REPLACEMENT',
    intervalType: IntervalType.BOTH,
    mileageInterval: 20000,
    daysInterval: 1080,
  },
  {
    kindId: 21,
    kindCode: 'WIPER_BLADES_REPLACEMENT',
    intervalType: IntervalType.NONE,
    mileageInterval: 0,
    daysInterval: 0,
  },
  {
    kindId: 22,
    kindCode: 'SEASONAL_TIRE_SERVICE',
    intervalType: IntervalType.NONE,
    mileageInterval: 0,
    daysInterval: 0,
  },
  {
    kindId: 23,
    kindCode: 'TIRE_BALANCE',
    intervalType: IntervalType.MILEAGE,
    mileageInterval: 10000,
    daysInterval: 0,
  },
  {
    kindId: 24,
    kindCode: 'TIRE_ROTATION',
    intervalType: IntervalType.BOTH,
    mileageInterval: 10000,
    daysInterval: 180,
  },
  // New maintenance items with recommended intervals
  {
    kindId: 25,
    kindCode: 'FRONT_REAR_PADS_CHANGE',
    intervalType: IntervalType.BOTH,
    mileageInterval: 50000,
    daysInterval: 1440,
  },
  {
    kindId: 26,
    kindCode: 'POWER_STEERING_OIL_CHANGE',
    intervalType: IntervalType.BOTH,
    mileageInterval: 80000,
    daysInterval: 1440,
  },
  {
    kindId: 27,
    kindCode: 'DIFFERENTIAL_OIL_CHANGE',
    intervalType: IntervalType.BOTH,
    mileageInterval: 50000,
    daysInterval: 1440,
  },
  {
    kindId: 28,
    kindCode: 'BATTERY_REPLACEMENT',
    intervalType: IntervalType.BOTH,
    mileageInterval: 80000,
    daysInterval: 1440,
  },
  {
    kindId: 29,
    kindCode: 'AC_SERVICE_RECHARGE',
    intervalType: IntervalType.BOTH,
    mileageInterval: 40000,
    daysInterval: 720,
  },
  {
    kindId: 30,
    kindCode: 'SERPENTINE_BELT_REPLACEMENT',
    intervalType: IntervalType.BOTH,
    mileageInterval: 80000,
    daysInterval: 1800,
  },
  {
    kindId: 31,
    kindCode: 'COOLANT_FLUSH',
    intervalType: IntervalType.BOTH,
    mileageInterval: 50000,
    daysInterval: 1080,
  },
];

// Type exports
export type ExpenseIntervalDefault = (typeof serviceIntervalDefaults)[number];

// Helper to get interval default by kind id
export const getIntervalDefaultByKindId = (kindId: number): ExpenseIntervalDefault | undefined => {
  return serviceIntervalDefaults.find((interval) => interval.kindId === kindId);
};

// Helper to get interval default by kind code
export const getIntervalDefaultByKindCode = (kindCode: string): ExpenseIntervalDefault | undefined => {
  return serviceIntervalDefaults.find((interval) => interval.kindCode === kindCode);
};

// Helper to get all schedulable expense kinds (those with intervals)
export const getSchedulableExpenseKinds = (): ExpenseIntervalDefault[] => {
  return serviceIntervalDefaults.filter((interval) => interval.intervalType !== IntervalType.NONE);
};

// Helper to format interval for display
export const formatInterval = (interval: ExpenseIntervalDefault): string => {
  switch (interval.intervalType) {
    case IntervalType.NONE:
      return 'No schedule';
    case IntervalType.MILEAGE:
      return `Every ${interval.mileageInterval.toLocaleString()} km`;
    case IntervalType.DAYS:
      return `Every ${interval.daysInterval} days`;
    case IntervalType.BOTH:
      return `Every ${interval.mileageInterval.toLocaleString()} km or ${interval.daysInterval} days`;
    default:
      return 'Unknown';
  }
};
