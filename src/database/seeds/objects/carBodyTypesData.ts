export const carBodyTypes = [
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
    id: 1,
    orderNo: 10,
    code: 'SEDAN',
    langs: {
      en: 'Sedan',
      ru: 'Седан',
    },
  },
  {
    id: 2,
    orderNo: 20,
    code: 'HATCHBACK',
    langs: {
      en: 'Hatchback',
      ru: 'Хэтчбек',
    },
  },
  {
    id: 3,
    orderNo: 30,
    code: 'SUV',
    langs: {
      en: 'SUV',
      ru: 'Внедорожник',
    },
  },
  {
    id: 4,
    orderNo: 40,
    code: 'CROSSOVER',
    langs: {
      en: 'Crossover',
      ru: 'Кроссовер',
    },
  },
  {
    id: 5,
    orderNo: 50,
    code: 'TRUCK',
    langs: {
      en: 'Truck',
      ru: 'Грузовик',
    },
  },
  {
    id: 6,
    orderNo: 60,
    code: 'PICKUP',
    langs: {
      en: 'Pickup',
      ru: 'Пикап',
    },
  },
  {
    id: 7,
    orderNo: 70,
    code: 'MICROVAN',
    langs: {
      en: 'Microvan',
      ru: 'Микровэн',
    },
  },
  {
    id: 8,
    orderNo: 80,
    code: 'MINIVAN',
    langs: {
      en: 'Minivan',
      ru: 'Минивэн',
    },
  },
  {
    id: 9,
    orderNo: 90,
    code: 'VAN',
    langs: {
      en: 'Van',
      ru: 'Фургон',
    },
  },
  {
    id: 10,
    orderNo: 100,
    code: 'WAGON',
    langs: {
      en: 'Wagon',
      ru: 'Универсал',
    },
  },
  {
    id: 11,
    orderNo: 110,
    code: 'COUPE',
    langs: {
      en: 'Coupe',
      ru: 'Купе',
    },
  },
  {
    id: 12,
    orderNo: 120,
    code: 'CONVERTIBLE',
    langs: {
      en: 'Convertible',
      ru: 'Кабриолет',
    },
  },
  {
    id: 13,
    orderNo: 130,
    code: 'SPORT',
    langs: {
      en: 'Sport',
      ru: 'Спорткар',
    },
  },
  {
    id: 14,
    orderNo: 140,
    code: 'LIMOUSINE',
    langs: {
      en: 'Limousine',
      ru: 'Лимузин',
    },
  },
  {
    id: 15,
    orderNo: 150,
    code: 'RV',
    langs: {
      en: 'RV',
      ru: 'Автодом',
    },
  },
  {
    id: 16,
    orderNo: 160,
    code: 'MINIBUS',
    langs: {
      en: 'Minibus',
      ru: 'Микроавтобус',
    },
  },
  {
    id: 17,
    orderNo: 170,
    code: 'BUS',
    langs: {
      en: 'Bus',
      ru: 'Автобус',
    },
  },
  {
    id: 18,
    orderNo: 180,
    code: 'FREIGHT',
    langs: {
      en: 'Freight',
      ru: 'Грузовой',
    },
  },
  {
    id: 100,
    orderNo: 1000,
    code: 'MOTORCYCLE',
    langs: {
      en: 'Motorcycle',
      ru: 'Мотоцикл',
    },
  },
  {
    id: 101,
    orderNo: 1010,
    code: 'SCOOTER',
    langs: {
      en: 'Scooter',
      ru: 'Скутер',
    },
  },
  {
    id: 1000,
    orderNo: 10000,
    code: 'OTHER',
    langs: {
      en: 'Other',
      ru: 'Другое',
    },
  },
];

export type CarBodyType = (typeof carBodyTypes)[number];
export type CarBodyTypeCode = CarBodyType['code'];
