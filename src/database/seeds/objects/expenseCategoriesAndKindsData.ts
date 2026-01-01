export const expenseCategoriesWithKinds = [
  // Most frequent first
  {
    id: 1,
    orderNo: 10,
    code: 'MAINTENANCE',
    langs: {
      en: 'Maintenance',
      ru: 'Обслуживание',
      fr: 'Entretien',
    },
    expenseKinds: [
      {
        id: 1,
        orderNo: 10,
        code: 'ENGINE_OIL_FILTER_CHANGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Engine oil and filter change',
          ru: 'Замена машинного масла и фильтра',
          fr: "Vidange d'huile moteur et filtre",
        },
      },
      {
        id: 2,
        orderNo: 20,
        code: 'PLANNED_PARTS_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Planned replacement (Parts)',
          ru: 'Плановая замена (детали)',
          fr: 'Remplacement prévu (pièces)',
        },
      },
      {
        id: 3,
        orderNo: 30,
        code: 'CONSUMABLES_PURCHASE',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Purchase (consumables)',
          ru: 'Покупка (расходные материалы)',
          fr: 'Achat (consommables)',
        },
      },
      {
        id: 4,
        orderNo: 40,
        code: 'WHEEL_ALIGNMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Wheel alignment',
          ru: 'Сход развал',
          fr: 'Géométrie des roues',
        },
      },
      {
        id: 5,
        orderNo: 50,
        code: 'ELECTRONICS_DIAGNOSTIC',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Diagnosing electronics',
          ru: 'Диагностика электроники',
          fr: 'Diagnostic électronique',
        },
      },
      {
        id: 6,
        orderNo: 60,
        code: 'UNDERCARRIAGE_DIAGNOSTIC',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Diagnosing of undercarriage',
          ru: 'Диагностика ходовой',
          fr: 'Diagnostic du train roulant',
        },
      },
      {
        id: 7,
        orderNo: 70,
        code: 'TRANSMISSION_OIL_CHANGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Transmission oil change',
          ru: 'Масло в коробке передач (замена)',
          fr: 'Vidange huile de boîte de vitesses',
        },
      },
      {
        id: 8,
        orderNo: 80,
        code: 'BRAKE_FLUID_CHANGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Brake fluid change',
          ru: 'Тормозная жидкость (замена)',
          fr: 'Remplacement liquide de frein',
        },
      },
      {
        id: 9,
        orderNo: 90,
        code: 'ANTIFREEZE_CHANGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Antifreeze change',
          ru: 'Антифриз (замена)',
          fr: "Remplacement de l'antigel",
        },
      },
      {
        id: 10,
        orderNo: 100,
        code: 'ALTERNATOR_BELT_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Alternator belt replacement',
          ru: 'Ремень генератора (замена)',
          fr: "Remplacement courroie d'alternateur",
        },
      },
      {
        id: 11,
        orderNo: 110,
        code: 'TIMING_BELT_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Timing belt replacement',
          ru: 'Ремень ГРМ и натяжные ролики (замена)',
          fr: 'Remplacement courroie de distribution',
        },
      },
      {
        id: 12,
        orderNo: 120,
        code: 'REAR_BRAKE_PADS_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Rear brake pads replacement',
          ru: 'Задние тормозные колодки (замена)',
          fr: 'Remplacement plaquettes de frein arrière',
        },
      },
      {
        id: 13,
        orderNo: 130,
        code: 'FRONT_BRAKE_PADS_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Front brake pads replacement',
          ru: 'Передние тормозные колодки (замена)',
          fr: 'Remplacement plaquettes de frein avant',
        },
      },
      {
        id: 14,
        orderNo: 140,
        code: 'FULL_BRAKES_CHANGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Brakes change (all pads and rotors)',
          ru: 'Замена тормозов (все колодки и роторов)',
          fr: 'Remplacement freins (plaquettes et disques)',
        },
      },
      {
        id: 15,
        orderNo: 150,
        code: 'FRONT_ROTORS_PADS_CHANGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Front rotors and pads change',
          ru: 'Замена передних колодок и роторов',
          fr: 'Remplacement disques et plaquettes avant',
        },
      },
      {
        id: 16,
        orderNo: 160,
        code: 'REAR_ROTORS_PADS_CHANGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Rear rotors and pads change',
          ru: 'Замена задних колодок и роторов',
          fr: 'Remplacement disques et plaquettes arrière',
        },
      },
      {
        id: 17,
        orderNo: 170,
        code: 'CABIN_FILTER_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Cabin filter replacement',
          ru: 'Салонный фильтр (замена)',
          fr: 'Remplacement filtre habitacle',
        },
      },
      {
        id: 18,
        orderNo: 180,
        code: 'AIR_FILTER_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Air filter replacement',
          ru: 'Воздушный фильтр (замена)',
          fr: 'Remplacement filtre à air',
        },
      },
      {
        id: 19,
        orderNo: 190,
        code: 'FUEL_FILTER_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Fuel filter replacement',
          ru: 'Топливный фильтр (замена)',
          fr: 'Remplacement filtre à carburant',
        },
      },
      {
        id: 20,
        orderNo: 200,
        code: 'SPARK_PLUGS_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Spark plugs replacement',
          ru: 'Свечи зажигания (замена)',
          fr: "Remplacement bougies d'allumage",
        },
      },
      {
        id: 21,
        orderNo: 210,
        code: 'WIPER_BLADES_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Replacing the wiper blades',
          ru: 'Щетки стеклоочистителя (замена)',
          fr: "Remplacement balais d'essuie-glace",
        },
      },
      {
        id: 22,
        orderNo: 220,
        code: 'SEASONAL_TIRE_SERVICE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Seasonal tire service',
          ru: 'Сезонный шиномонтаж',
          fr: 'Changement de pneus saisonnier',
        },
      },
      {
        id: 23,
        orderNo: 230,
        code: 'TIRE_BALANCE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Tire balance',
          ru: 'Балансировка колёс',
          fr: 'Équilibrage des pneus',
        },
      },
      {
        id: 24,
        orderNo: 240,
        code: 'TIRE_ROTATION',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Tire rotation',
          ru: 'Перестановка колес',
          fr: 'Permutation des pneus',
        },
      },
      {
        id: 25,
        orderNo: 250,
        code: 'FRONT_REAR_PADS_CHANGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Front and Rear pads change',
          ru: 'Колодки передние и задние (замена)',
          fr: 'Remplacement plaquettes avant et arrière',
        },
      },
      {
        id: 26,
        orderNo: 260,
        code: 'POWER_STEERING_OIL_CHANGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Oil change in the hydraulic booster',
          ru: 'Масло в гидроусилителе (замена)',
          fr: 'Vidange huile de direction assistée',
        },
      },
      {
        id: 27,
        orderNo: 270,
        code: 'DIFFERENTIAL_OIL_CHANGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Differential oil change',
          ru: 'Масло в дифференциале (замена)',
          fr: 'Vidange huile de différentiel',
        },
      },
      {
        id: 28,
        orderNo: 280,
        code: 'BATTERY_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Battery replacement',
          ru: 'Замена аккумулятора',
          fr: 'Remplacement de la batterie',
        },
      },
      {
        id: 29,
        orderNo: 290,
        code: 'AC_SERVICE_RECHARGE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'A/C service and recharge',
          ru: 'Обслуживание и заправка кондиционера',
          fr: 'Entretien et recharge de climatisation',
        },
      },
      {
        id: 30,
        orderNo: 300,
        code: 'SERPENTINE_BELT_REPLACEMENT',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Serpentine belt replacement',
          ru: 'Замена приводного ремня',
          fr: "Remplacement courroie d'accessoires",
        },
      },
      {
        id: 31,
        orderNo: 310,
        code: 'COOLANT_FLUSH',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Coolant flush',
          ru: 'Промывка системы охлаждения',
          fr: 'Purge du circuit de refroidissement',
        },
      },
      {
        id: 199,
        orderNo: 9990,
        code: 'SCHEDULED_MAINTENANCE',
        canSchedule: true,
        isMaintenance: true,
        langs: {
          en: 'Scheduled maintenance',
          ru: 'Техобслуживание плановое',
          fr: 'Entretien programmé',
        },
      },
    ],
  },
  {
    id: 5,
    orderNo: 20,
    code: 'COMFORT_CLEANING',
    langs: {
      en: 'Comfort & Cleaning',
      ru: 'Комфорт и чистка',
      fr: 'Confort et nettoyage',
    },
    expenseKinds: [
      {
        id: 501,
        orderNo: 10,
        code: 'CAR_WASH_FULL',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Car wash (full)',
          ru: 'Мойка (полная)',
          fr: 'Lavage auto (complet)',
        },
      },
      {
        id: 502,
        orderNo: 20,
        code: 'CAR_WASH_INTERIOR',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Car wash (interior)',
          ru: 'Мойка (салон)',
          fr: 'Lavage auto (intérieur)',
        },
      },
      {
        id: 503,
        orderNo: 30,
        code: 'CAR_WASH_EXTERIOR',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Car wash (exterior)',
          ru: 'Мойка (снаружи)',
          fr: 'Lavage auto (extérieur)',
        },
      },
      {
        id: 504,
        orderNo: 40,
        code: 'CAR_WASH_WHEELS',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Car wash (wheels)',
          ru: 'Мойка (колеса)',
          fr: 'Lavage auto (roues)',
        },
      },
      {
        id: 505,
        orderNo: 50,
        code: 'CAR_WASH_TRUNK',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Car wash (trunk)',
          ru: 'Мойка (багажник)',
          fr: 'Lavage auto (coffre)',
        },
      },
      {
        id: 506,
        orderNo: 60,
        code: 'CAR_WASH_ENGINE_BAY',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Car wash (engine bay)',
          ru: 'Мойка (моторный отсек)',
          fr: 'Lavage auto (compartiment moteur)',
        },
      },
      {
        id: 507,
        orderNo: 70,
        code: 'CAR_WASH_UNDERBODY',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Car wash (underbody)',
          ru: 'Мойка (низ машины)',
          fr: 'Lavage auto (dessous de caisse)',
        },
      },
      {
        id: 508,
        orderNo: 80,
        code: 'DETAILING',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Detailing',
          ru: 'Детейлинг',
          fr: 'Detailing',
        },
      },
      {
        id: 509,
        orderNo: 90,
        code: 'INTERIOR_FRESHENER',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Interior freshener/fragrance',
          ru: 'Освежитель/ароматизатор салона',
          fr: "Désodorisant/parfum d'intérieur",
        },
      },
      {
        id: 510,
        orderNo: 100,
        code: 'POLISHING',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Polishing',
          ru: 'Полировка',
          fr: 'Polissage',
        },
      },
      {
        id: 599,
        orderNo: 9990,
        code: 'COMFORT_CLEANING_OTHER',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Other comfort & cleaning',
          ru: 'Другое (комфорт и чистка)',
          fr: 'Autre (confort et nettoyage)',
        },
      },
    ],
  },
  {
    id: 3,
    orderNo: 30,
    code: 'COMMON',
    langs: {
      en: 'Administrative & Fees',
      ru: 'Административное и сборы',
      fr: 'Administratif et frais',
    },
    expenseKinds: [
      {
        id: 301,
        orderNo: 10,
        code: 'AUTO_INSURANCE',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Auto insurance',
          ru: 'Автомобильная страховка',
          fr: 'Assurance auto',
        },
      },
      {
        id: 306,
        orderNo: 20,
        code: 'PARKING',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Parking',
          ru: 'Парковка',
          fr: 'Stationnement',
        },
      },
      {
        id: 312,
        orderNo: 30,
        code: 'TOLLS',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Tolls',
          ru: 'Платная дорога',
          fr: 'Péages',
        },
      },
      {
        id: 309,
        orderNo: 40,
        code: 'FINANCING_LEASING',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Financing/Leasing payment',
          ru: 'Оплата кредита/лизинга',
          fr: 'Paiement financement/leasing',
        },
      },
      {
        id: 302,
        orderNo: 50,
        code: 'TECHNICAL_INSPECTION',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Technical inspection',
          ru: 'Техническая инспекция',
          fr: 'Contrôle technique',
        },
      },
      {
        id: 303,
        orderNo: 60,
        code: 'EMISSIONS_INSPECTION',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Emissions inspection',
          ru: 'Инспекция на эмиссии',
          fr: 'Contrôle des émissions',
        },
      },
      {
        id: 310,
        orderNo: 70,
        code: 'VEHICLE_REGISTRATION',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Vehicle registration',
          ru: 'Регистрация автомобиля',
          fr: 'Immatriculation du véhicule',
        },
      },
      {
        id: 304,
        orderNo: 80,
        code: 'LICENSE_PLATE_PAYMENT',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Payment for license plate',
          ru: 'Оплата за номерные знаки',
          fr: "Paiement plaque d'immatriculation",
        },
      },
      {
        id: 307,
        orderNo: 90,
        code: 'TAXES',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Taxes',
          ru: 'Налог',
          fr: 'Taxes',
        },
      },
      {
        id: 305,
        orderNo: 100,
        code: 'TRAFFIC_VIOLATION_TICKET',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Traffic violation ticket',
          ru: 'Штраф за нарушение ПДД',
          fr: 'Amende pour infraction',
        },
      },
      {
        id: 308,
        orderNo: 110,
        code: 'MEMBERSHIPS',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Memberships (CAA, AMA, etc.)',
          ru: 'Членские взносы',
          fr: 'Adhésions (clubs auto, etc.)',
        },
      },
      {
        id: 311,
        orderNo: 120,
        code: 'TOWING',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Towing expenses',
          ru: 'Эвакуатор',
          fr: 'Frais de remorquage',
        },
      },
      {
        id: 399,
        orderNo: 9990,
        code: 'COMMON_OTHER',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Other payments',
          ru: 'Другие платежи',
          fr: 'Autres paiements',
        },
      },
    ],
  },
  {
    id: 6,
    orderNo: 40,
    code: 'CONSUMABLES',
    langs: {
      en: 'Consumables',
      ru: 'Расходники',
      fr: 'Consommables',
    },
    expenseKinds: [
      {
        id: 603,
        orderNo: 10,
        code: 'ENGINE_OIL_TOPUP',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Engine oil (topping up)',
          ru: 'Машинное масло (долив)',
          fr: 'Huile moteur (appoint)',
        },
      },
      {
        id: 602,
        orderNo: 20,
        code: 'OIL_FILLING',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Oil filling',
          ru: 'Заправка масла',
          fr: "Remplissage d'huile",
        },
      },
      {
        id: 601,
        orderNo: 30,
        code: 'ADDITIVES_REFILL',
        canSchedule: true,
        isMaintenance: false,
        langs: {
          en: 'Refilling additives',
          ru: 'Заправка присадки',
          fr: "Remplissage d'additifs",
        },
      },
      {
        id: 604,
        orderNo: 40,
        code: 'WASHER_FLUID',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Windshield washer fluid',
          ru: 'Жидкость стеклоомывателя',
          fr: 'Liquide lave-glace',
        },
      },
      {
        id: 605,
        orderNo: 50,
        code: 'COOLANT_TOPUP',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Antifreeze/coolant (topping up)',
          ru: 'Антифриз/охлаждающая жидкость (долив)',
          fr: 'Antigel/liquide de refroidissement (appoint)',
        },
      },
      {
        id: 606,
        orderNo: 60,
        code: 'BRAKE_FLUID_TOPUP',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Brake fluid (topping up)',
          ru: 'Тормозная жидкость (долив)',
          fr: 'Liquide de frein (appoint)',
        },
      },
      {
        id: 607,
        orderNo: 70,
        code: 'POWER_STEERING_FLUID_TOPUP',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Power steering fluid (topping up)',
          ru: 'Жидкость ГУР (долив)',
          fr: 'Liquide de direction assistée (appoint)',
        },
      },
      {
        id: 699,
        orderNo: 9990,
        code: 'CONSUMABLES_OTHER',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Other consumables',
          ru: 'Другие расходники',
          fr: 'Autres consommables',
        },
      },
    ],
  },
  {
    id: 2,
    orderNo: 50,
    code: 'REPAIRS',
    langs: {
      en: 'Repairs',
      ru: 'Ремонт',
      fr: 'Réparations',
    },
    expenseKinds: [
      {
        id: 298,
        orderNo: 10,
        code: 'PROBLEM_DIAGNOSTIC',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Diagnosing the problem',
          ru: 'Диагностика проблемы',
          fr: 'Diagnostic du problème',
        },
      },
      {
        id: 201,
        orderNo: 20,
        code: 'UNPLANNED_PARTS_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Replacement (parts)',
          ru: 'Внеплановая замена (детали)',
          fr: 'Remplacement (pièces)',
        },
      },
      {
        id: 202,
        orderNo: 30,
        code: 'PARTS_REPAIR',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Repair (Parts)',
          ru: 'Ремонт (детали)',
          fr: 'Réparation (pièces)',
        },
      },
      {
        id: 213,
        orderNo: 40,
        code: 'TIRE_REPAIR_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Tire repair/replacement',
          ru: 'Шина ремонт/замена',
          fr: 'Réparation/remplacement pneu',
        },
      },
      {
        id: 205,
        orderNo: 50,
        code: 'WINDSHIELD_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Windshield replacement',
          ru: 'Замена лобового стекла',
          fr: 'Remplacement pare-brise',
        },
      },
      {
        id: 206,
        orderNo: 60,
        code: 'MIRROR_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Mirror replacement',
          ru: 'Замена зеркала',
          fr: 'Remplacement rétroviseur',
        },
      },
      {
        id: 207,
        orderNo: 70,
        code: 'GLASS_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Glass replacement',
          ru: 'Замена стекол',
          fr: 'Remplacement vitres',
        },
      },
      {
        id: 208,
        orderNo: 80,
        code: 'HEADLIGHTS_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Headlights replacement',
          ru: 'Замена фар',
          fr: 'Remplacement phares',
        },
      },
      {
        id: 209,
        orderNo: 90,
        code: 'TAIL_LIGHTS_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Tail lights replacement',
          ru: 'Замена задних фонарей',
          fr: 'Remplacement feux arrière',
        },
      },
      {
        id: 210,
        orderNo: 100,
        code: 'BUMPER_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Bumper replacement',
          ru: 'Замена бампера',
          fr: 'Remplacement pare-chocs',
        },
      },
      {
        id: 211,
        orderNo: 110,
        code: 'DOOR_REPAIR_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Door repair/replacement',
          ru: 'Дверь ремонт/замена',
          fr: 'Réparation/remplacement portière',
        },
      },
      {
        id: 212,
        orderNo: 120,
        code: 'RADIATOR_REPAIR_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Radiator repair/replacement',
          ru: 'Радиатор ремонт/замена',
          fr: 'Réparation/remplacement radiateur',
        },
      },
      {
        id: 203,
        orderNo: 130,
        code: 'PAINTING',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Painting',
          ru: 'Покраска',
          fr: 'Peinture',
        },
      },
      {
        id: 204,
        orderNo: 140,
        code: 'BODY_ALIGNMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Body alignment',
          ru: 'Рихтовка',
          fr: 'Débosselage',
        },
      },
      {
        id: 290,
        orderNo: 900,
        code: 'ENGINE_REPAIR_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Engine repair/replacement',
          ru: 'Двигатель ремонт/замена',
          fr: 'Réparation/remplacement moteur',
        },
      },
      {
        id: 291,
        orderNo: 910,
        code: 'FUEL_SYSTEM_REPAIR_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Fuel system repair/replacement',
          ru: 'Топливная система ремонт/замена',
          fr: "Réparation/remplacement système d'alimentation",
        },
      },
      {
        id: 292,
        orderNo: 920,
        code: 'TRANSMISSION_REPAIR_REPLACEMENT',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Transmission repair/replacement',
          ru: 'Коробка передач ремонт/замена',
          fr: 'Réparation/remplacement boîte de vitesses',
        },
      },
      {
        id: 293,
        orderNo: 930,
        code: 'SUSPENSION_REPAIR',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Suspension repair',
          ru: 'Ремонт подвески',
          fr: 'Réparation suspension',
        },
      },
      {
        id: 294,
        orderNo: 940,
        code: 'STEERING_REPAIR',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Steering repair',
          ru: 'Ремонт рулевого управления',
          fr: 'Réparation direction',
        },
      },
      {
        id: 295,
        orderNo: 950,
        code: 'EXHAUST_SYSTEM_REPAIR',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Exhaust system repair',
          ru: 'Ремонт выхлопной системы',
          fr: "Réparation système d'échappement",
        },
      },
      {
        id: 296,
        orderNo: 960,
        code: 'AC_REPAIR',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'A/C repair',
          ru: 'Ремонт кондиционера',
          fr: 'Réparation climatisation',
        },
      },
      {
        id: 297,
        orderNo: 970,
        code: 'ELECTRICAL_SYSTEM_REPAIR',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Electrical system repair',
          ru: 'Ремонт электрики',
          fr: 'Réparation système électrique',
        },
      },
      {
        id: 299,
        orderNo: 9990,
        code: 'REPAIRS_OTHER',
        canSchedule: false,
        isMaintenance: true,
        langs: {
          en: 'Other unplanned expenses',
          ru: 'Другие незапланированные расходы',
          fr: 'Autres dépenses imprévues',
        },
      },
    ],
  },
  {
    id: 4,
    orderNo: 60,
    code: 'ACCESSORIES',
    langs: {
      en: 'Accessories',
      ru: 'Аксессуары',
      fr: 'Accessoires',
    },
    expenseKinds: [
      {
        id: 403,
        orderNo: 10,
        code: 'PARTS_PURCHASE',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Purchase (parts)',
          ru: 'Покупка (детали)',
          fr: 'Achat (pièces)',
        },
      },
      {
        id: 401,
        orderNo: 20,
        code: 'PARTS_ALTERATION',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Alteration (parts)',
          ru: 'Изменение (детали)',
          fr: 'Modification (pièces)',
        },
      },
      {
        id: 402,
        orderNo: 30,
        code: 'PARTS_REPLACING',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Replacing (parts)',
          ru: 'Замена (детали)',
          fr: 'Remplacement (pièces)',
        },
      },
      {
        id: 498,
        orderNo: 980,
        code: 'ACCESSORIES_EXPENSES',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Accessories expenses',
          ru: 'Расходы на аксессуары',
          fr: 'Dépenses accessoires',
        },
      },
      {
        id: 499,
        orderNo: 990,
        code: 'TUNING_EXPENSES',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Tuning expenses',
          ru: 'Расходы на тюнинг',
          fr: 'Dépenses tuning',
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
    },
    expenseKinds: [
      {
        id: 701,
        orderNo: 10,
        code: 'MISCELLANEOUS',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Miscellaneous expense',
          ru: 'Прочие расходы',
          fr: 'Dépenses diverses',
        },
      },
      {
        id: 799,
        orderNo: 9990,
        code: 'OTHER_EXPENSE',
        canSchedule: false,
        isMaintenance: false,
        langs: {
          en: 'Other expense',
          ru: 'Другой расход',
          fr: 'Autre dépense',
        },
      },
    ],
  },
];

// Type exports
export type LangKeys = 'en' | 'ru' | 'fr';

export type ExpenseKind = {
  id: number;
  orderNo: number;
  code: string;
  canSchedule: boolean;
  isMaintenance: boolean;
  langs: Record<LangKeys, string>;
};

export type ExpenseCategory = {
  id: number;
  orderNo: number;
  code: string;
  langs: Record<LangKeys, string>;
  expenseKinds: ExpenseKind[];
};

export type ExpenseCategoryCode = (typeof expenseCategoriesWithKinds)[number]['code'];
export type ExpenseKindCode = ExpenseKind['code'];

// Helper to get flat list of all expense kinds
export const getAllExpenseKinds = (): ExpenseKind[] => {
  return expenseCategoriesWithKinds.flatMap((category) => category.expenseKinds);
};

// Helper to get expense kinds by category id
export const getExpenseKindsByCategoryId = (categoryId: number): ExpenseKind[] => {
  const category = expenseCategoriesWithKinds.find((c) => c.id === categoryId);
  return category?.expenseKinds ?? [];
};

// Helper to get category by expense kind id
export const getCategoryByExpenseKindId = (expenseKindId: number): ExpenseCategory | undefined => {
  return expenseCategoriesWithKinds.find((category) => category.expenseKinds.some((kind) => kind.id === expenseKindId));
};

// Helper to get expense kind by code
export const getExpenseKindByCode = (code: string): ExpenseKind | undefined => {
  return getAllExpenseKinds().find((kind) => kind.code === code);
};

// Helper to get localized name
export const getLocalizedName = (item: { langs: Record<LangKeys, string> }, lang: LangKeys = 'en'): string => {
  return item.langs[lang] ?? item.langs.en;
};
