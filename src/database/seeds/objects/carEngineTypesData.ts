export const carEngineTypes = [
  {
    id: 0,
    orderNo: 0,
    code: 'UNKNOWN',
    langs: {
      en: 'Unknown',
      ru: 'Неизвестно',
    },
  },
  {
    id: 10,
    orderNo: 10,
    code: 'PETROL',
    langs: {
      en: 'Gasoline',
      ru: 'Бензин',
    },
  },
  {
    id: 20,
    orderNo: 20,
    code: 'DIESEL',
    langs: {
      en: 'Diesel',
      ru: 'Дизель',
    },
  },
  {
    id: 30,
    orderNo: 30,
    code: 'GAS',
    langs: {
      en: 'Natural Gas',
      ru: 'Газ',
    },
  },
  {
    id: 40,
    orderNo: 40,
    code: 'GAS-PETROL',
    langs: {
      en: 'Gas/Petrol (LPG)',
      ru: 'Газ/Бензин',
    },
  },
  {
    id: 50,
    orderNo: 50,
    code: 'HYBRID',
    langs: {
      en: 'Hybrid',
      ru: 'Гибрид',
    },
  },
  {
    id: 60,
    orderNo: 60,
    code: 'BIOFUEL',
    langs: {
      en: 'Biofuel',
      ru: 'Биотопливо',
    },
  },
  {
    id: 70,
    orderNo: 70,
    code: 'ELECTRIC',
    langs: {
      en: 'Electric',
      ru: 'Электро',
    },
  },
  {
    id: 80,
    orderNo: 80,
    code: 'PLUGIN_HYBRID',
    langs: {
      en: 'Plug-in Hybrid',
      ru: 'Плагин-гибрид',
    },
  },
  {
    id: 90,
    orderNo: 90,
    code: 'HYDROGEN',
    langs: {
      en: 'Hydrogen',
      ru: 'Водород',
    },
  },
  {
    id: 1000,
    orderNo: 1000,
    code: 'OTHER',
    langs: {
      en: 'Other',
      ru: 'Другое',
    },
  },
];

export type CarEngineType = (typeof carEngineTypes)[number];
export type CarEngineTypeCode = CarEngineType['code'];
