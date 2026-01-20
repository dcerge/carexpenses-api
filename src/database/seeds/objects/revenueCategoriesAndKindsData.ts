// ./src/database/seeds/objects/revenueCategoriesAndKindsData.js

const revenueCategoriesWithKinds = [
  {
    id: 1,
    orderNo: 10,
    code: 'TRANSPORTATION',
    langs: {
      en: 'Transportation Services',
      ru: 'Транспортные услуги',
      fr: 'Services de transport',
      es: 'Servicios de transporte',
    },
    revenueKinds: [
      {
        id: 101,
        orderNo: 10,
        code: 'RIDESHARE',
        langs: {
          en: 'Rideshare (Uber, Lyft, etc.)',
          ru: 'Такси-сервис (Uber, Lyft и т.д.)',
          fr: 'Covoiturage (Uber, Lyft, etc.)',
          es: 'Viaje compartido (Uber, Lyft, etc.)',
        },
      },
      {
        id: 102,
        orderNo: 20,
        code: 'TAXI',
        langs: {
          en: 'Taxi service',
          ru: 'Услуги такси',
          fr: 'Service de taxi',
          es: 'Servicio de taxi',
        },
      },
      {
        id: 103,
        orderNo: 30,
        code: 'FOOD_DELIVERY',
        langs: {
          en: 'Food delivery',
          ru: 'Доставка еды',
          fr: 'Livraison de repas',
          es: 'Entrega de comida',
        },
      },
      {
        id: 104,
        orderNo: 40,
        code: 'PACKAGE_DELIVERY',
        langs: {
          en: 'Package delivery',
          ru: 'Доставка посылок',
          fr: 'Livraison de colis',
          es: 'Entrega de paquetes',
        },
      },
      {
        id: 105,
        orderNo: 50,
        code: 'COURIER',
        langs: {
          en: 'Courier services',
          ru: 'Курьерские услуги',
          fr: 'Services de coursier',
          es: 'Servicios de mensajería',
        },
      },
      {
        id: 106,
        orderNo: 60,
        code: 'PASSENGER_TRANSPORT',
        langs: {
          en: 'Passenger transportation',
          ru: 'Перевозка пассажиров',
          fr: 'Transport de passagers',
          es: 'Transporte de pasajeros',
        },
      },
      {
        id: 199,
        orderNo: 9990,
        code: 'TRANSPORTATION_OTHER',
        langs: {
          en: 'Other transportation',
          ru: 'Другие транспортные услуги',
          fr: 'Autre transport',
          es: 'Otro transporte',
        },
      },
    ],
  },
  {
    id: 2,
    orderNo: 20,
    code: 'RENTAL',
    langs: {
      en: 'Vehicle Rental',
      ru: 'Аренда транспорта',
      fr: 'Location de véhicule',
      es: 'Alquiler de vehículo',
    },
    revenueKinds: [
      {
        id: 201,
        orderNo: 10,
        code: 'PEER_TO_PEER_RENTAL',
        langs: {
          en: 'Peer-to-peer rental (Turo, etc.)',
          ru: 'Аренда между частными лицами (Turo и т.д.)',
          fr: 'Location entre particuliers (Turo, etc.)',
          es: 'Alquiler entre particulares (Turo, etc.)',
        },
      },
      {
        id: 202,
        orderNo: 20,
        code: 'SHORT_TERM_RENTAL',
        langs: {
          en: 'Short-term rental',
          ru: 'Краткосрочная аренда',
          fr: 'Location courte durée',
          es: 'Alquiler a corto plazo',
        },
      },
      {
        id: 203,
        orderNo: 30,
        code: 'LONG_TERM_RENTAL',
        langs: {
          en: 'Long-term rental',
          ru: 'Долгосрочная аренда',
          fr: 'Location longue durée',
          es: 'Alquiler a largo plazo',
        },
      },
      {
        id: 204,
        orderNo: 40,
        code: 'CORPORATE_RENTAL',
        langs: {
          en: 'Corporate/business rental',
          ru: 'Корпоративная аренда',
          fr: 'Location entreprise',
          es: 'Alquiler corporativo',
        },
      },
      {
        id: 299,
        orderNo: 9990,
        code: 'RENTAL_OTHER',
        langs: {
          en: 'Other rental income',
          ru: 'Другой доход от аренды',
          fr: 'Autre revenu de location',
          es: 'Otros ingresos de alquiler',
        },
      },
    ],
  },
  {
    id: 3,
    orderNo: 30,
    code: 'COMMERCIAL',
    langs: {
      en: 'Commercial Services',
      ru: 'Коммерческие услуги',
      fr: 'Services commerciaux',
      es: 'Servicios comerciales',
    },
    revenueKinds: [
      {
        id: 301,
        orderNo: 10,
        code: 'CARGO_TRANSPORT',
        langs: {
          en: 'Cargo transportation',
          ru: 'Грузоперевозки',
          fr: 'Transport de marchandises',
          es: 'Transporte de carga',
        },
      },
      {
        id: 302,
        orderNo: 20,
        code: 'MOVING_SERVICES',
        langs: {
          en: 'Moving services',
          ru: 'Услуги переезда',
          fr: 'Services de déménagement',
          es: 'Servicios de mudanza',
        },
      },
      {
        id: 303,
        orderNo: 30,
        code: 'TOWING_SERVICES',
        langs: {
          en: 'Towing services',
          ru: 'Услуги эвакуатора',
          fr: 'Services de remorquage',
          es: 'Servicios de remolque',
        },
      },
      {
        id: 304,
        orderNo: 40,
        code: 'CONTRACT_WORK',
        langs: {
          en: 'Contract work',
          ru: 'Контрактная работа',
          fr: 'Travail sous contrat',
          es: 'Trabajo por contrato',
        },
      },
      {
        id: 399,
        orderNo: 9990,
        code: 'COMMERCIAL_OTHER',
        langs: {
          en: 'Other commercial services',
          ru: 'Другие коммерческие услуги',
          fr: 'Autres services commerciaux',
          es: 'Otros servicios comerciales',
        },
      },
    ],
  },
  {
    id: 4,
    orderNo: 40,
    code: 'ADVERTISING',
    langs: {
      en: 'Advertising',
      ru: 'Реклама',
      fr: 'Publicité',
      es: 'Publicidad',
    },
    revenueKinds: [
      {
        id: 401,
        orderNo: 10,
        code: 'VEHICLE_WRAP',
        langs: {
          en: 'Vehicle wrap advertising',
          ru: 'Реклама на оклейке авто',
          fr: 'Publicité covering véhicule',
          es: 'Publicidad en envoltura de vehículo',
        },
      },
      {
        id: 402,
        orderNo: 20,
        code: 'VEHICLE_DECAL',
        langs: {
          en: 'Vehicle decal/sticker advertising',
          ru: 'Реклама на наклейках',
          fr: 'Publicité autocollants véhicule',
          es: 'Publicidad en calcomanías de vehículo',
        },
      },
      {
        id: 403,
        orderNo: 30,
        code: 'MOBILE_BILLBOARD',
        langs: {
          en: 'Mobile billboard',
          ru: 'Мобильный билборд',
          fr: 'Panneau publicitaire mobile',
          es: 'Valla publicitaria móvil',
        },
      },
      {
        id: 404,
        orderNo: 40,
        code: 'DIGITAL_DISPLAY',
        langs: {
          en: 'Digital display advertising',
          ru: 'Цифровая реклама на экране',
          fr: 'Publicité écran numérique',
          es: 'Publicidad en pantalla digital',
        },
      },
      {
        id: 499,
        orderNo: 9990,
        code: 'ADVERTISING_OTHER',
        langs: {
          en: 'Other advertising income',
          ru: 'Другой рекламный доход',
          fr: 'Autre revenu publicitaire',
          es: 'Otros ingresos publicitarios',
        },
      },
    ],
  },
  {
    id: 5,
    orderNo: 50,
    code: 'REIMBURSEMENT',
    langs: {
      en: 'Reimbursements',
      ru: 'Возмещения',
      fr: 'Remboursements',
      es: 'Reembolsos',
    },
    revenueKinds: [
      {
        id: 501,
        orderNo: 10,
        code: 'MILEAGE_REIMBURSEMENT',
        langs: {
          en: 'Mileage reimbursement',
          ru: 'Возмещение за пробег',
          fr: 'Remboursement kilométrique',
          es: 'Reembolso por kilometraje',
        },
      },
      {
        id: 502,
        orderNo: 20,
        code: 'EXPENSE_REIMBURSEMENT',
        langs: {
          en: 'Expense reimbursement',
          ru: 'Возмещение расходов',
          fr: 'Remboursement de frais',
          es: 'Reembolso de gastos',
        },
      },
      {
        id: 503,
        orderNo: 30,
        code: 'INSURANCE_CLAIM',
        langs: {
          en: 'Insurance claim payout',
          ru: 'Выплата по страховке',
          fr: "Paiement d'assurance",
          es: 'Pago de reclamación de seguro',
        },
      },
      {
        id: 504,
        orderNo: 40,
        code: 'WARRANTY_REFUND',
        langs: {
          en: 'Warranty refund',
          ru: 'Возврат по гарантии',
          fr: 'Remboursement garantie',
          es: 'Reembolso de garantía',
        },
      },
      {
        id: 505,
        orderNo: 50,
        code: 'FUEL_REIMBURSEMENT',
        langs: {
          en: 'Fuel reimbursement',
          ru: 'Возмещение за топливо',
          fr: 'Remboursement carburant',
          es: 'Reembolso de combustible',
        },
      },
      {
        id: 506,
        orderNo: 60,
        code: 'EMPLOYER_ALLOWANCE',
        langs: {
          en: 'Employer vehicle allowance',
          ru: 'Компенсация от работодателя',
          fr: 'Indemnité véhicule employeur',
          es: 'Subsidio de vehículo del empleador',
        },
      },
      {
        id: 599,
        orderNo: 9990,
        code: 'REIMBURSEMENT_OTHER',
        langs: {
          en: 'Other reimbursement',
          ru: 'Другое возмещение',
          fr: 'Autre remboursement',
          es: 'Otro reembolso',
        },
      },
    ],
  },
  {
    id: 6,
    orderNo: 60,
    code: 'BONUSES',
    langs: {
      en: 'Bonuses & Incentives',
      ru: 'Бонусы и поощрения',
      fr: 'Bonus et incitations',
      es: 'Bonos e incentivos',
    },
    revenueKinds: [
      {
        id: 601,
        orderNo: 10,
        code: 'REFERRAL_BONUS',
        langs: {
          en: 'Referral bonus',
          ru: 'Реферальный бонус',
          fr: 'Bonus de parrainage',
          es: 'Bono de referencia',
        },
      },
      {
        id: 602,
        orderNo: 20,
        code: 'PERFORMANCE_BONUS',
        langs: {
          en: 'Performance bonus',
          ru: 'Бонус за производительность',
          fr: 'Bonus de performance',
          es: 'Bono de rendimiento',
        },
      },
      {
        id: 603,
        orderNo: 30,
        code: 'SIGNUP_BONUS',
        langs: {
          en: 'Sign-up bonus',
          ru: 'Бонус за регистрацию',
          fr: "Bonus d'inscription",
          es: 'Bono de registro',
        },
      },
      {
        id: 604,
        orderNo: 40,
        code: 'QUEST_INCENTIVE',
        langs: {
          en: 'Quest/challenge incentive',
          ru: 'Поощрение за задание',
          fr: 'Incitation défi/quête',
          es: 'Incentivo de misión/desafío',
        },
      },
      {
        id: 605,
        orderNo: 50,
        code: 'TIP',
        langs: {
          en: 'Tip/gratuity',
          ru: 'Чаевые',
          fr: 'Pourboire',
          es: 'Propina',
        },
      },
      {
        id: 699,
        orderNo: 9990,
        code: 'BONUSES_OTHER',
        langs: {
          en: 'Other bonus/incentive',
          ru: 'Другой бонус/поощрение',
          fr: 'Autre bonus/incitation',
          es: 'Otro bono/incentivo',
        },
      },
    ],
  },
  {
    id: 7,
    orderNo: 1000,
    code: 'OTHER',
    langs: {
      en: 'Other',
      ru: 'Другое',
      fr: 'Autre',
      es: 'Otro',
    },
    revenueKinds: [
      {
        id: 701,
        orderNo: 10,
        code: 'PARTS_SALE',
        langs: {
          en: 'Parts/accessories sale',
          ru: 'Продажа запчастей/аксессуаров',
          fr: 'Vente de pièces/accessoires',
          es: 'Venta de piezas/accesorios',
        },
      },
      {
        id: 702,
        orderNo: 20,
        code: 'SCRAP_SALE',
        langs: {
          en: 'Scrap/salvage sale',
          ru: 'Продажа на металлолом',
          fr: 'Vente de ferraille/récupération',
          es: 'Venta de chatarra/salvamento',
        },
      },
      {
        id: 799,
        orderNo: 9990,
        code: 'OTHER_REVENUE',
        langs: {
          en: 'Other revenue',
          ru: 'Другой доход',
          fr: 'Autre revenu',
          es: 'Otro ingreso',
        },
      },
    ],
  },
];

module.exports = {
  revenueCategoriesWithKinds,
};