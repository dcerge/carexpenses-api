export const carTransmissionTypes = [
  {
    id: 0,
    orderNo: 1,
    code: 'UNKNOWN',
    langs: {
      en: 'Unknown',
      ru: 'Неизвестно',
    },
  },
  {
    id: 10,
    orderNo: 10,
    code: 'AUTOMATIC',
    langs: {
      en: 'Automatic',
      ru: 'Автомат',
    },
  },
  {
    id: 20,
    orderNo: 20,
    code: 'ADAPTIVE',
    langs: {
      en: 'Adaptive',
      ru: 'Адаптивная',
    },
  },
  {
    id: 30,
    orderNo: 30,
    code: 'CVT',
    langs: {
      en: 'CVT (Continuously Variable)',
      ru: 'Вариатор',
    },
  },
  {
    id: 40,
    orderNo: 40,
    code: 'ROBOTIC',
    langs: {
      en: 'Automated Manual (Robotic)',
      ru: 'Робот',
    },
  },
  {
    id: 50,
    orderNo: 50,
    code: 'MANUAL',
    langs: {
      en: 'Manual',
      ru: 'Механика',
    },
  },
  {
    id: 60,
    orderNo: 60,
    code: 'TIPTRONIC',
    langs: {
      en: 'Tiptronic',
      ru: 'Типтроник',
    },
  },
  {
    id: 70,
    orderNo: 70,
    code: 'DCT',
    langs: {
      en: 'Dual-Clutch (DCT)',
      ru: 'Преселективная (DSG)',
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

export type CarTransmissionType = (typeof carTransmissionTypes)[number];
export type CarTransmissionTypeCode = CarTransmissionType['code'];
