const MAINTENANCE = {
  id: 1,
  orderNo: 10,
  code: 'MAINTENANCE',
  langs: {
    en: 'Maintenance',
    ru: 'Обслуживание',
    fr: 'Entretien',
    es: 'Mantenimiento',
  },
  expenseKinds: [
    { id: 1, orderNo: 10, code: 'ENGINE_OIL_FILTER_CHANGE', canSchedule: true, isMaintenance: true, langs: { en: 'Engine oil and filter change', ru: 'Замена машинного масла и фильтра', fr: "Vidange d'huile moteur et filtre", es: 'Cambio de aceite y filtro del motor' } },
    { id: 2, orderNo: 20, code: 'PLANNED_PARTS_REPLACEMENT', isMaintenance: true, langs: { en: 'Planned replacement (Parts)', ru: 'Плановая замена (детали)', fr: 'Remplacement prévu (pièces)', es: 'Reemplazo planificado (piezas)' } },
    { id: 3, orderNo: 30, code: 'CONSUMABLES_PURCHASE', isMaintenance: true, langs: { en: 'Purchase (consumables)', ru: 'Покупка (расходные материалы)', fr: 'Achat (consommables)', es: 'Compra (consumibles)' } },
    { id: 4, orderNo: 40, code: 'WHEEL_ALIGNMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Wheel alignment', ru: 'Сход развал', fr: 'Géométrie des roues', es: 'Alineación de ruedas' } },
    { id: 5, orderNo: 50, code: 'ELECTRONICS_DIAGNOSTIC', canSchedule: true, isMaintenance: true, langs: { en: 'Diagnosing electronics', ru: 'Диагностика электроники', fr: 'Diagnostic électronique', es: 'Diagnóstico de electrónica' } },
    { id: 6, orderNo: 60, code: 'UNDERCARRIAGE_DIAGNOSTIC', canSchedule: true, isMaintenance: true, langs: { en: 'Diagnosing of undercarriage', ru: 'Диагностика ходовой', fr: 'Diagnostic du train roulant', es: 'Diagnóstico del tren de rodaje' } },
    { id: 7, orderNo: 70, code: 'TRANSMISSION_OIL_CHANGE', canSchedule: true, isMaintenance: true, langs: { en: 'Transmission oil change', ru: 'Масло в коробке передач (замена)', fr: 'Vidange huile de boîte de vitesses', es: 'Cambio de aceite de transmisión' } },
    { id: 8, orderNo: 80, code: 'BRAKE_FLUID_CHANGE', canSchedule: true, isMaintenance: true, langs: { en: 'Brake fluid change', ru: 'Тормозная жидкость (замена)', fr: 'Remplacement liquide de frein', es: 'Cambio de líquido de frenos' } },
    { id: 9, orderNo: 90, code: 'ANTIFREEZE_CHANGE', canSchedule: true, isMaintenance: true, langs: { en: 'Antifreeze change', ru: 'Антифриз (замена)', fr: "Remplacement de l'antigel", es: 'Cambio de anticongelante' } },
    { id: 10, orderNo: 100, code: 'ALTERNATOR_BELT_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Alternator belt replacement', ru: 'Ремень генератора (замена)', fr: "Remplacement courroie d'alternateur", es: 'Reemplazo de correa del alternador' } },
    { id: 11, orderNo: 110, code: 'TIMING_BELT_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Timing belt replacement', ru: 'Ремень ГРМ и натяжные ролики (замена)', fr: 'Remplacement courroie de distribution', es: 'Reemplazo de correa de distribución' } },
    { id: 12, orderNo: 120, code: 'REAR_BRAKE_PADS_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Rear brake pads replacement', ru: 'Задние тормозные колодки (замена)', fr: 'Remplacement plaquettes de frein arrière', es: 'Reemplazo de pastillas de freno traseras' } },
    { id: 13, orderNo: 130, code: 'FRONT_BRAKE_PADS_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Front brake pads replacement', ru: 'Передние тормозные колодки (замена)', fr: 'Remplacement plaquettes de frein avant', es: 'Reemplazo de pastillas de freno delanteras' } },
    { id: 14, orderNo: 140, code: 'FULL_BRAKES_CHANGE', canSchedule: true, isMaintenance: true, langs: { en: 'Brakes change (all pads and rotors)', ru: 'Замена тормозов (все колодки и роторов)', fr: 'Remplacement freins (plaquettes et disques)', es: 'Cambio de frenos (todas las pastillas y discos)' } },
    { id: 15, orderNo: 150, code: 'FRONT_ROTORS_PADS_CHANGE', canSchedule: true, isMaintenance: true, langs: { en: 'Front rotors and pads change', ru: 'Замена передних колодок и роторов', fr: 'Remplacement disques et plaquettes avant', es: 'Cambio de discos y pastillas delanteros' } },
    { id: 16, orderNo: 160, code: 'REAR_ROTORS_PADS_CHANGE', canSchedule: true, isMaintenance: true, langs: { en: 'Rear rotors and pads change', ru: 'Замена задних колодок и роторов', fr: 'Remplacement disques et plaquettes arrière', es: 'Cambio de discos y pastillas traseros' } },
    { id: 17, orderNo: 170, code: 'CABIN_FILTER_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Cabin filter replacement', ru: 'Салонный фильтр (замена)', fr: 'Remplacement filtre habitacle', es: 'Reemplazo de filtro de cabina' } },
    { id: 18, orderNo: 180, code: 'AIR_FILTER_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Air filter replacement', ru: 'Воздушный фильтр (замена)', fr: 'Remplacement filtre à air', es: 'Reemplazo de filtro de aire' } },
    { id: 19, orderNo: 190, code: 'FUEL_FILTER_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Fuel filter replacement', ru: 'Топливный фильтр (замена)', fr: 'Remplacement filtre à carburant', es: 'Reemplazo de filtro de combustible' } },
    { id: 20, orderNo: 200, code: 'SPARK_PLUGS_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Spark plugs replacement', ru: 'Свечи зажигания (замена)', fr: "Remplacement bougies d'allumage", es: 'Reemplazo de bujías' } },
    { id: 21, orderNo: 210, code: 'WIPER_BLADES_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Replacing the wiper blades', ru: 'Щетки стеклоочистителя (замена)', fr: "Remplacement balais d'essuie-glace", es: 'Reemplazo de escobillas del limpiaparabrisas' } },
    { id: 22, orderNo: 220, code: 'SEASONAL_TIRE_SERVICE', canSchedule: true, isMaintenance: true, langs: { en: 'Seasonal tire service', ru: 'Сезонный шиномонтаж', fr: 'Changement de pneus saisonnier', es: 'Servicio de neumáticos de temporada' } },
    { id: 23, orderNo: 230, code: 'TIRE_BALANCE', canSchedule: true, isMaintenance: true, langs: { en: 'Tire balance', ru: 'Балансировка колёс', fr: 'Équilibrage des pneus', es: 'Balanceo de neumáticos' } },
    { id: 24, orderNo: 240, code: 'TIRE_ROTATION', canSchedule: true, isMaintenance: true, langs: { en: 'Tire rotation', ru: 'Перестановка колес', fr: 'Permutation des pneus', es: 'Rotación de neumáticos' } },
    { id: 25, orderNo: 250, code: 'FRONT_REAR_PADS_CHANGE', canSchedule: true, isMaintenance: true, langs: { en: 'Front and Rear pads change', ru: 'Колодки передние и задние (замена)', fr: 'Remplacement plaquettes avant et arrière', es: 'Cambio de pastillas delanteras y traseras' } },
    { id: 26, orderNo: 260, code: 'POWER_STEERING_OIL_CHANGE', canSchedule: true, isMaintenance: true, langs: { en: 'Oil change in the hydraulic booster', ru: 'Масло в гидроусилителе (замена)', fr: 'Vidange huile de direction assistée', es: 'Cambio de aceite de dirección asistida' } },
    { id: 27, orderNo: 270, code: 'DIFFERENTIAL_OIL_CHANGE', canSchedule: true, isMaintenance: true, langs: { en: 'Differential oil change', ru: 'Масло в дифференциале (замена)', fr: 'Vidange huile de différentiel', es: 'Cambio de aceite del diferencial' } },
    { id: 28, orderNo: 280, code: 'BATTERY_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Battery replacement', ru: 'Замена аккумулятора', fr: 'Remplacement de la batterie', es: 'Reemplazo de batería' } },
    { id: 29, orderNo: 290, code: 'AC_SERVICE_RECHARGE', canSchedule: true, isMaintenance: true, langs: { en: 'A/C service and recharge', ru: 'Обслуживание и заправка кондиционера', fr: 'Entretien et recharge de climatisation', es: 'Servicio y recarga de aire acondicionado' } },
    { id: 30, orderNo: 300, code: 'SERPENTINE_BELT_REPLACEMENT', canSchedule: true, isMaintenance: true, langs: { en: 'Serpentine belt replacement', ru: 'Замена приводного ремня', fr: "Remplacement courroie d'accessoires", es: 'Reemplazo de correa serpentina' } },
    { id: 31, orderNo: 310, code: 'COOLANT_FLUSH', canSchedule: true, isMaintenance: true, langs: { en: 'Coolant flush', ru: 'Промывка системы охлаждения', fr: 'Purge du circuit de refroidissement', es: 'Purga del sistema de refrigeración' } },
    { id: 199, orderNo: 9990, code: 'SCHEDULED_MAINTENANCE', canSchedule: true, isMaintenance: true, langs: { en: 'Scheduled maintenance', ru: 'Техобслуживание плановое', fr: 'Entretien programmé', es: 'Mantenimiento programado' } },
  ],
};

const COMFORT_CLEANING = {
  id: 5,
  orderNo: 20,
  code: 'COMFORT_CLEANING',
  langs: {
    en: 'Comfort & Cleaning',
    ru: 'Комфорт и чистка',
    fr: 'Confort et nettoyage',
    es: 'Confort y limpieza',
  },
  expenseKinds: [
    { id: 501, orderNo: 10, code: 'CAR_WASH_FULL', canSchedule: true, langs: { en: 'Car wash (full)', ru: 'Мойка (полная)', fr: 'Lavage auto (complet)', es: 'Lavado de auto (completo)' } },
    { id: 502, orderNo: 20, code: 'CAR_WASH_INTERIOR', canSchedule: true, langs: { en: 'Car wash (interior)', ru: 'Мойка (салон)', fr: 'Lavage auto (intérieur)', es: 'Lavado de auto (interior)' } },
    { id: 503, orderNo: 30, code: 'CAR_WASH_EXTERIOR', canSchedule: true, langs: { en: 'Car wash (exterior)', ru: 'Мойка (снаружи)', fr: 'Lavage auto (extérieur)', es: 'Lavado de auto (exterior)' } },
    { id: 504, orderNo: 40, code: 'CAR_WASH_WHEELS', canSchedule: true, langs: { en: 'Car wash (wheels)', ru: 'Мойка (колеса)', fr: 'Lavage auto (roues)', es: 'Lavado de auto (ruedas)' } },
    { id: 505, orderNo: 50, code: 'CAR_WASH_TRUNK', canSchedule: true, langs: { en: 'Car wash (trunk)', ru: 'Мойка (багажник)', fr: 'Lavage auto (coffre)', es: 'Lavado de auto (maletero)' } },
    { id: 506, orderNo: 60, code: 'CAR_WASH_ENGINE_BAY', canSchedule: true, langs: { en: 'Car wash (engine bay)', ru: 'Мойка (моторный отсек)', fr: 'Lavage auto (compartiment moteur)', es: 'Lavado de auto (compartimiento del motor)' } },
    { id: 507, orderNo: 70, code: 'CAR_WASH_UNDERBODY', canSchedule: true, langs: { en: 'Car wash (underbody)', ru: 'Мойка (низ машины)', fr: 'Lavage auto (dessous de caisse)', es: 'Lavado de auto (parte inferior)' } },
    { id: 508, orderNo: 80, code: 'DETAILING', canSchedule: true, langs: { en: 'Detailing', ru: 'Детейлинг', fr: 'Detailing', es: 'Detallado' } },
    { id: 509, orderNo: 90, code: 'INTERIOR_FRESHENER', langs: { en: 'Interior freshener/fragrance', ru: 'Освежитель/ароматизатор салона', fr: "Désodorisant/parfum d'intérieur", es: 'Ambientador / fragancia interior' } },
    { id: 510, orderNo: 100, code: 'POLISHING', langs: { en: 'Polishing', ru: 'Полировка', fr: 'Polissage', es: 'Pulido' } },
    { id: 599, orderNo: 9990, code: 'COMFORT_CLEANING_OTHER', langs: { en: 'Other comfort & cleaning', ru: 'Другое (комфорт и чистка)', fr: 'Autre (confort et nettoyage)', es: 'Otro (confort y limpieza)' } },
  ],
};

const COMMON = {
  id: 3,
  orderNo: 30,
  code: 'COMMON',
  langs: {
    en: 'Administrative & Fees',
    ru: 'Административное и сборы',
    fr: 'Administratif et frais',
    es: 'Administrativo y tasas',
  },
  expenseKinds: [
    { id: 301, orderNo: 10, code: 'AUTO_INSURANCE', canSchedule: true, langs: { en: 'Auto insurance', ru: 'Автомобильная страховка', fr: 'Assurance auto', es: 'Seguro de auto' } },
    { id: 306, orderNo: 20, code: 'PARKING', canSchedule: true, langs: { en: 'Parking', ru: 'Парковка', fr: 'Stationnement', es: 'Estacionamiento' } },
    { id: 312, orderNo: 30, code: 'TOLLS', langs: { en: 'Tolls', ru: 'Платная дорога', fr: 'Péages', es: 'Peajes' } },
    { id: 309, orderNo: 40, code: 'FINANCING_LEASING', canSchedule: true, langs: { en: 'Financing/Leasing payment', ru: 'Оплата кредита/лизинга', fr: 'Paiement financement/leasing', es: 'Pago de financiamiento/leasing' } },
    { id: 302, orderNo: 50, code: 'TECHNICAL_INSPECTION', canSchedule: true, langs: { en: 'Technical inspection', ru: 'Техническая инспекция', fr: 'Contrôle technique', es: 'Inspección técnica' } },
    { id: 303, orderNo: 60, code: 'EMISSIONS_INSPECTION', canSchedule: true, langs: { en: 'Emissions inspection', ru: 'Инспекция на эмиссии', fr: 'Contrôle des émissions', es: 'Inspección de emisiones' } },
    { id: 310, orderNo: 70, code: 'VEHICLE_REGISTRATION', langs: { en: 'Vehicle registration', ru: 'Регистрация автомобиля', fr: 'Immatriculation du véhicule', es: 'Registro del vehículo' } },
    { id: 304, orderNo: 80, code: 'LICENSE_PLATE_PAYMENT', canSchedule: true, langs: { en: 'Payment for license plate', ru: 'Оплата за номерные знаки', fr: "Paiement plaque d'immatriculation", es: 'Pago de placa de matrícula' } },
    { id: 307, orderNo: 90, code: 'TAXES', canSchedule: true, langs: { en: 'Taxes', ru: 'Налог', fr: 'Taxes', es: 'Impuestos' } },
    { id: 305, orderNo: 100, code: 'TRAFFIC_VIOLATION_TICKET', langs: { en: 'Traffic violation ticket', ru: 'Штраф за нарушение ПДД', fr: 'Amende pour infraction', es: 'Multa por infracción de tránsito' } },
    { id: 308, orderNo: 110, code: 'MEMBERSHIPS', canSchedule: true, langs: { en: 'Memberships (CAA, AMA, etc.)', ru: 'Членские взносы', fr: 'Adhésions (clubs auto, etc.)', es: 'Membresías (clubes de auto, etc.)' } },
    { id: 311, orderNo: 120, code: 'TOWING', langs: { en: 'Towing expenses', ru: 'Эвакуатор', fr: 'Frais de remorquage', es: 'Gastos de grúa' } },
    { id: 399, orderNo: 9990, code: 'COMMON_OTHER', langs: { en: 'Other payments', ru: 'Другие платежи', fr: 'Autres paiements', es: 'Otros pagos' } },
  ],
};

const CONSUMABLES = {
  id: 6,
  orderNo: 40,
  code: 'CONSUMABLES',
  langs: {
    en: 'Consumables',
    ru: 'Расходники',
    fr: 'Consommables',
    es: 'Consumibles',
  },
  expenseKinds: [
    { id: 603, orderNo: 10, code: 'ENGINE_OIL_TOPUP', langs: { en: 'Engine oil (topping up)', ru: 'Машинное масло (долив)', fr: 'Huile moteur (appoint)', es: 'Aceite de motor (relleno)' } },
    { id: 602, orderNo: 20, code: 'OIL_FILLING', langs: { en: 'Oil filling', ru: 'Заправка масла', fr: "Remplissage d'huile", es: 'Llenado de aceite' } },
    { id: 601, orderNo: 30, code: 'ADDITIVES_REFILL', canSchedule: true, langs: { en: 'Refilling additives', ru: 'Заправка присадки', fr: "Remplissage d'additifs", es: 'Recarga de aditivos' } },
    { id: 604, orderNo: 40, code: 'WASHER_FLUID', langs: { en: 'Windshield washer fluid', ru: 'Жидкость стеклоомывателя', fr: 'Liquide lave-glace', es: 'Líquido limpiaparabrisas' } },
    { id: 605, orderNo: 50, code: 'COOLANT_TOPUP', langs: { en: 'Antifreeze/coolant (topping up)', ru: 'Антифриз/охлаждающая жидкость (долив)', fr: 'Antigel/liquide de refroidissement (appoint)', es: 'Anticongelante/refrigerante (relleno)' } },
    { id: 606, orderNo: 60, code: 'BRAKE_FLUID_TOPUP', langs: { en: 'Brake fluid (topping up)', ru: 'Тормозная жидкость (долив)', fr: 'Liquide de frein (appoint)', es: 'Líquido de frenos (relleno)' } },
    { id: 607, orderNo: 70, code: 'POWER_STEERING_FLUID_TOPUP', langs: { en: 'Power steering fluid (topping up)', ru: 'Жидкость ГУР (долив)', fr: 'Liquide de direction assistée (appoint)', es: 'Líquido de dirección asistida (relleno)' } },
    { id: 699, orderNo: 9990, code: 'CONSUMABLES_OTHER', langs: { en: 'Other consumables', ru: 'Другие расходники', fr: 'Autres consommables', es: 'Otros consumibles' } },
  ],
};

const REPAIRS = {
  id: 2,
  orderNo: 50,
  code: 'REPAIRS',
  langs: {
    en: 'Repairs',
    ru: 'Ремонт',
    fr: 'Réparations',
    es: 'Reparaciones',
  },
  expenseKinds: [
    { id: 298, orderNo: 10, code: 'PROBLEM_DIAGNOSTIC', isMaintenance: true, langs: { en: 'Diagnosing the problem', ru: 'Диагностика проблемы', fr: 'Diagnostic du problème', es: 'Diagnóstico del problema' } },
    { id: 201, orderNo: 20, code: 'UNPLANNED_PARTS_REPLACEMENT', isMaintenance: true, langs: { en: 'Replacement (parts)', ru: 'Внеплановая замена (детали)', fr: 'Remplacement (pièces)', es: 'Reemplazo (piezas)' } },
    { id: 202, orderNo: 30, code: 'PARTS_REPAIR', isMaintenance: true, langs: { en: 'Repair (Parts)', ru: 'Ремонт (детали)', fr: 'Réparation (pièces)', es: 'Reparación (piezas)' } },
    { id: 213, orderNo: 40, code: 'TIRE_REPAIR_REPLACEMENT', isMaintenance: true, langs: { en: 'Tire repair/replacement', ru: 'Шина ремонт/замена', fr: 'Réparation/remplacement pneu', es: 'Reparación/reemplazo de neumático' } },
    { id: 205, orderNo: 50, code: 'WINDSHIELD_REPLACEMENT', isMaintenance: true, langs: { en: 'Windshield replacement', ru: 'Замена лобового стекла', fr: 'Remplacement pare-brise', es: 'Reemplazo de parabrisas' } },
    { id: 206, orderNo: 60, code: 'MIRROR_REPLACEMENT', isMaintenance: true, langs: { en: 'Mirror replacement', ru: 'Замена зеркала', fr: 'Remplacement rétroviseur', es: 'Reemplazo de espejo' } },
    { id: 207, orderNo: 70, code: 'GLASS_REPLACEMENT', isMaintenance: true, langs: { en: 'Glass replacement', ru: 'Замена стекол', fr: 'Remplacement vitres', es: 'Reemplazo de vidrios' } },
    { id: 208, orderNo: 80, code: 'HEADLIGHTS_REPLACEMENT', isMaintenance: true, langs: { en: 'Headlights replacement', ru: 'Замена фар', fr: 'Remplacement phares', es: 'Reemplazo de faros' } },
    { id: 209, orderNo: 90, code: 'TAIL_LIGHTS_REPLACEMENT', isMaintenance: true, langs: { en: 'Tail lights replacement', ru: 'Замена задних фонарей', fr: 'Remplacement feux arrière', es: 'Reemplazo de luces traseras' } },
    { id: 210, orderNo: 100, code: 'BUMPER_REPLACEMENT', isMaintenance: true, langs: { en: 'Bumper replacement', ru: 'Замена бампера', fr: 'Remplacement pare-chocs', es: 'Reemplazo de parachoques' } },
    { id: 211, orderNo: 110, code: 'DOOR_REPAIR_REPLACEMENT', isMaintenance: true, langs: { en: 'Door repair/replacement', ru: 'Дверь ремонт/замена', fr: 'Réparation/remplacement portière', es: 'Reparación/reemplazo de puerta' } },
    { id: 212, orderNo: 120, code: 'RADIATOR_REPAIR_REPLACEMENT', isMaintenance: true, langs: { en: 'Radiator repair/replacement', ru: 'Радиатор ремонт/замена', fr: 'Réparation/remplacement radiateur', es: 'Reparación/reemplazo de radiador' } },
    { id: 203, orderNo: 130, code: 'PAINTING', isMaintenance: true, langs: { en: 'Painting', ru: 'Покраска', fr: 'Peinture', es: 'Pintura' } },
    { id: 204, orderNo: 140, code: 'BODY_ALIGNMENT', isMaintenance: true, langs: { en: 'Body alignment', ru: 'Рихтовка', fr: 'Débosselage', es: 'Enderezado de carrocería' } },
    { id: 290, orderNo: 900, code: 'ENGINE_REPAIR_REPLACEMENT', isMaintenance: true, langs: { en: 'Engine repair/replacement', ru: 'Двигатель ремонт/замена', fr: 'Réparation/remplacement moteur', es: 'Reparación/reemplazo de motor' } },
    { id: 291, orderNo: 910, code: 'FUEL_SYSTEM_REPAIR_REPLACEMENT', isMaintenance: true, langs: { en: 'Fuel system repair/replacement', ru: 'Топливная система ремонт/замена', fr: "Réparation/remplacement système d'alimentation", es: 'Reparación/reemplazo del sistema de combustible' } },
    { id: 292, orderNo: 920, code: 'TRANSMISSION_REPAIR_REPLACEMENT', isMaintenance: true, langs: { en: 'Transmission repair/replacement', ru: 'Коробка передач ремонт/замена', fr: 'Réparation/remplacement boîte de vitesses', es: 'Reparación/reemplazo de transmisión' } },
    { id: 293, orderNo: 930, code: 'SUSPENSION_REPAIR', isMaintenance: true, langs: { en: 'Suspension repair', ru: 'Ремонт подвески', fr: 'Réparation suspension', es: 'Reparación de suspensión' } },
    { id: 294, orderNo: 940, code: 'STEERING_REPAIR', isMaintenance: true, langs: { en: 'Steering repair', ru: 'Ремонт рулевого управления', fr: 'Réparation direction', es: 'Reparación de dirección' } },
    { id: 295, orderNo: 950, code: 'EXHAUST_SYSTEM_REPAIR', isMaintenance: true, langs: { en: 'Exhaust system repair', ru: 'Ремонт выхлопной системы', fr: "Réparation système d'échappement", es: 'Reparación del sistema de escape' } },
    { id: 296, orderNo: 960, code: 'AC_REPAIR', isMaintenance: true, langs: { en: 'A/C repair', ru: 'Ремонт кондиционера', fr: 'Réparation climatisation', es: 'Reparación de aire acondicionado' } },
    { id: 297, orderNo: 970, code: 'ELECTRICAL_SYSTEM_REPAIR', isMaintenance: true, langs: { en: 'Electrical system repair', ru: 'Ремонт электрики', fr: 'Réparation système électrique', es: 'Reparación del sistema eléctrico' } },
    { id: 299, orderNo: 9990, code: 'REPAIRS_OTHER', isMaintenance: true, langs: { en: 'Other unplanned expenses', ru: 'Другие незапланированные расходы', fr: 'Autres dépenses imprévues', es: 'Otros gastos no planificados' } },
  ],
};

const ACCESSORIES = {
  id: 4,
  orderNo: 60,
  code: 'ACCESSORIES',
  langs: {
    en: 'Accessories',
    ru: 'Аксессуары',
    fr: 'Accessoires',
    es: 'Accesorios',
  },
  expenseKinds: [
    { id: 403, orderNo: 10, code: 'PARTS_PURCHASE', langs: { en: 'Purchase (parts)', ru: 'Покупка (детали)', fr: 'Achat (pièces)', es: 'Compra (piezas)' } },
    { id: 401, orderNo: 20, code: 'PARTS_ALTERATION', langs: { en: 'Alteration (parts)', ru: 'Изменение (детали)', fr: 'Modification (pièces)', es: 'Modificación (piezas)' } },
    { id: 402, orderNo: 30, code: 'PARTS_REPLACING', langs: { en: 'Replacing (parts)', ru: 'Замена (детали)', fr: 'Remplacement (pièces)', es: 'Reemplazo (piezas)' } },
    { id: 498, orderNo: 980, code: 'ACCESSORIES_EXPENSES', langs: { en: 'Accessories expenses', ru: 'Расходы на аксессуары', fr: 'Dépenses accessoires', es: 'Gastos de accesorios' } },
    { id: 499, orderNo: 990, code: 'TUNING_EXPENSES', langs: { en: 'Tuning expenses', ru: 'Расходы на тюнинг', fr: 'Dépenses tuning', es: 'Gastos de tuning' } },
  ],
};

const LODGING = {
  id: 8,
  orderNo: 70,
  code: 'LODGING',
  langs: {
    en: 'Lodging',
    ru: 'Проживание',
    fr: 'Hébergement',
    es: 'Alojamiento',
  },
  expenseKinds: [
    { id: 801, code: 'HOTEL_MOTEL', langs: { en: 'Hotel / Motel', ru: 'Отель / Мотель', fr: 'Hôtel / Motel', es: 'Hotel / Motel' } },
    { id: 802, code: 'HOSTEL', langs: { en: 'Hostel', ru: 'Хостел', fr: 'Auberge de jeunesse', es: 'Hostal' } },
    { id: 803, code: 'VACATION_RENTAL', langs: { en: 'Vacation rental (Airbnb, VRBO, etc.)', ru: 'Аренда жилья (Airbnb, VRBO и т.д.)', fr: 'Location de vacances (Airbnb, VRBO, etc.)', es: 'Alquiler vacacional (Airbnb, VRBO, etc.)' } },
    { id: 804, code: 'CAMPGROUND_RV_PARK', langs: { en: 'Campground / RV park', ru: 'Кемпинг / Стоянка для автодомов', fr: 'Camping / Aire de camping-car', es: 'Camping / Área de autocaravanas' } },
    { id: 899, code: 'LODGING_OTHER', langs: { en: 'Other lodging', ru: 'Другое проживание', fr: 'Autre hébergement', es: 'Otro alojamiento' } },
  ],
};

const FOOD_DRINKS = {
  id: 9,
  orderNo: 80,
  code: 'FOOD_DRINKS',
  langs: {
    en: 'Food & Drinks',
    ru: 'Еда и напитки',
    fr: 'Restauration',
    es: 'Comida y bebidas',
  },
  expenseKinds: [
    { id: 901, code: 'BREAKFAST', langs: { en: 'Breakfast', ru: 'Завтрак', fr: 'Petit-déjeuner', es: 'Desayuno' } },
    { id: 902, code: 'LUNCH', langs: { en: 'Lunch', ru: 'Обед', fr: 'Déjeuner', es: 'Almuerzo' } },
    { id: 903, code: 'DINNER', langs: { en: 'Dinner', ru: 'Ужин', fr: 'Dîner', es: 'Cena' } },
    { id: 904, code: 'SNACKS_DRINKS', langs: { en: 'Snacks & drinks', ru: 'Перекус и напитки', fr: 'Collations et boissons', es: 'Snacks y bebidas' } },
    { id: 905, code: 'COFFEE_TEA', langs: { en: 'Coffee / Tea', ru: 'Кофе / Чай', fr: 'Café / Thé', es: 'Café / Té' } },
    { id: 906, code: 'GROCERIES', langs: { en: 'Groceries', ru: 'Продукты', fr: 'Courses alimentaires', es: 'Compras de supermercado' } },
    { id: 999, code: 'FOOD_DRINKS_OTHER', langs: { en: 'Other food & drinks', ru: 'Другое (еда и напитки)', fr: 'Autre restauration', es: 'Otra comida y bebida' } },
  ],
};

const ENTERTAINMENT_ACTIVITIES = {
  id: 10,
  orderNo: 90,
  code: 'ENTERTAINMENT_ACTIVITIES',
  langs: {
    en: 'Entertainment & Activities',
    ru: 'Развлечения и активности',
    fr: 'Divertissements et activités',
    es: 'Entretenimiento y actividades',
  },
  expenseKinds: [
    { id: 1001, code: 'SIGHTSEEING_EXCURSION', langs: { en: 'Sightseeing / Excursion', ru: 'Экскурсия / Осмотр достопримечательностей', fr: 'Visite touristique / Excursion', es: 'Turismo / Excursión' } },
    { id: 1002, code: 'MUSEUM_GALLERY', langs: { en: 'Museum / Gallery', ru: 'Музей / Галерея', fr: 'Musée / Galerie', es: 'Museo / Galería' } },
    { id: 1003, code: 'THEME_PARK_ATTRACTION', langs: { en: 'Theme park / Attraction', ru: 'Парк аттракционов', fr: "Parc d'attractions", es: 'Parque temático / Atracción' } },
    { id: 1004, code: 'SPORTING_EVENT', langs: { en: 'Sporting event', ru: 'Спортивное мероприятие', fr: 'Événement sportif', es: 'Evento deportivo' } },
    { id: 1005, code: 'CONCERT_SHOW_THEATER', langs: { en: 'Concert / Show / Theater', ru: 'Концерт / Шоу / Театр', fr: 'Concert / Spectacle / Théâtre', es: 'Concierto / Espectáculo / Teatro' } },
    { id: 1006, code: 'NIGHTLIFE_BAR', langs: { en: 'Nightlife / Bar', ru: 'Ночная жизнь / Бар', fr: 'Vie nocturne / Bar', es: 'Vida nocturna / Bar' } },
    { id: 1007, code: 'SPA_WELLNESS', langs: { en: 'Spa / Wellness', ru: 'Спа / Оздоровление', fr: 'Spa / Bien-être', es: 'Spa / Bienestar' } },
    { id: 1008, code: 'OUTDOOR_SPORTS', langs: { en: 'Outdoor sports / Activities', ru: 'Спорт на открытом воздухе / Активности', fr: 'Sports de plein air / Activités', es: 'Deportes al aire libre / Actividades' } },
    { id: 1009, code: 'GUIDED_TOUR', langs: { en: 'Guided tour', ru: 'Экскурсия с гидом', fr: 'Visite guidée', es: 'Visita guiada' } },
    { id: 1099, code: 'ENTERTAINMENT_OTHER', langs: { en: 'Other entertainment', ru: 'Другие развлечения', fr: 'Autre divertissement', es: 'Otro entretenimiento' } },
  ],
};

const TRANSPORTATION = {
  id: 11,
  orderNo: 100,
  code: 'TRANSPORTATION',
  langs: {
    en: 'Transportation',
    ru: 'Транспорт',
    fr: 'Transport',
    es: 'Transporte',
  },
  expenseKinds: [
    { id: 1101, code: 'FERRY', langs: { en: 'Ferry', ru: 'Паром', fr: 'Ferry', es: 'Ferry' } },
    { id: 1102, code: 'PUBLIC_TRANSIT', langs: { en: 'Public transit (bus, metro, train)', ru: 'Общественный транспорт (автобус, метро, поезд)', fr: 'Transport en commun (bus, métro, train)', es: 'Transporte público (autobús, metro, tren)' } },
    { id: 1103, code: 'TAXI_RIDESHARE', langs: { en: 'Taxi / Rideshare', ru: 'Такси', fr: 'Taxi / VTC', es: 'Taxi / Viaje compartido' } },
    { id: 1104, code: 'RENTAL_VEHICLE', langs: { en: 'Rental vehicle', ru: 'Аренда транспорта', fr: 'Véhicule de location', es: 'Vehículo de alquiler' } },
    { id: 1105, code: 'SHUTTLE_TRANSFER', langs: { en: 'Shuttle / Transfer', ru: 'Шаттл / Трансфер', fr: 'Navette / Transfert', es: 'Shuttle / Traslado' } },
    { id: 1106, code: 'FLIGHT', langs: { en: 'Flight', ru: 'Авиаперелёт', fr: 'Vol', es: 'Vuelo' } },
    { id: 1199, code: 'TRANSPORTATION_OTHER', langs: { en: 'Other transportation', ru: 'Другой транспорт', fr: 'Autre transport', es: 'Otro transporte' } },
  ],
};

const TRAVEL_FEES_SERVICES = {
  id: 12,
  orderNo: 110,
  code: 'TRAVEL_FEES_SERVICES',
  langs: {
    en: 'Travel Fees & Services',
    ru: 'Сборы и услуги в поездке',
    fr: 'Frais et services de voyage',
    es: 'Tasas y servicios de viaje',
  },
  expenseKinds: [
    { id: 1201, code: 'BORDER_VISA_FEES', langs: { en: 'Border / Visa fees', ru: 'Пограничные / Визовые сборы', fr: 'Frais de frontière / Visa', es: 'Tasas de frontera / Visado' } },
    { id: 1202, code: 'TRAVEL_INSURANCE', langs: { en: 'Travel insurance', ru: 'Страховка путешественника', fr: 'Assurance voyage', es: 'Seguro de viaje' } },
    { id: 1203, code: 'ROAMING_SIM_INTERNET', langs: { en: 'Roaming / SIM card / Internet', ru: 'Роуминг / SIM-карта / Интернет', fr: 'Itinérance / Carte SIM / Internet', es: 'Roaming / Tarjeta SIM / Internet' } },
    { id: 1204, code: 'LAUNDRY_DRY_CLEANING', langs: { en: 'Laundry / Dry cleaning', ru: 'Прачечная / Химчистка', fr: 'Blanchisserie / Pressing', es: 'Lavandería / Tintorería' } },
    { id: 1205, code: 'EQUIPMENT_RENTAL', langs: { en: 'Equipment rental (chains, cargo racks, etc.)', ru: 'Аренда оборудования (цепи, багажники и т.д.)', fr: 'Location de matériel (chaînes, coffres de toit, etc.)', es: 'Alquiler de equipo (cadenas, portaequipajes, etc.)' } },
    { id: 1206, code: 'SOUVENIRS_GIFTS', langs: { en: 'Souvenirs / Gifts', ru: 'Сувениры / Подарки', fr: 'Souvenirs / Cadeaux', es: 'Recuerdos / Regalos' } },
    { id: 1207, code: 'TIPS_GRATUITIES', langs: { en: 'Tips / Gratuities', ru: 'Чаевые', fr: 'Pourboires', es: 'Propinas' } },
    { id: 1208, code: 'CURRENCY_EXCHANGE_FEES', langs: { en: 'Currency exchange fees', ru: 'Комиссия за обмен валюты', fr: 'Frais de change', es: 'Comisión de cambio de divisas' } },
    { id: 1299, code: 'TRAVEL_FEES_OTHER', langs: { en: 'Other travel fees & services', ru: 'Другие сборы и услуги в поездке', fr: 'Autres frais et services de voyage', es: 'Otras tasas y servicios de viaje' } },
  ],
};

const OTHER = {
  id: 7,
  orderNo: 1000,
  code: 'OTHER',
  langs: {
    en: 'Other',
    ru: 'Другое',
    fr: 'Autre',
    es: 'Otro',
  },
  expenseKinds: [
    { id: 701, orderNo: 10, code: 'MISCELLANEOUS', langs: { en: 'Miscellaneous expense', ru: 'Прочие расходы', fr: 'Dépenses diverses', es: 'Gastos varios' } },
    { id: 799, orderNo: 9990, code: 'OTHER_EXPENSE', langs: { en: 'Other expense', ru: 'Другой расход', fr: 'Autre dépense', es: 'Otro gasto' } },
  ],
};

// Final composition
export const expenseCategoriesWithKinds = [
  MAINTENANCE,
  COMFORT_CLEANING,
  COMMON,
  CONSUMABLES,
  REPAIRS,
  ACCESSORIES,
  LODGING,
  FOOD_DRINKS,
  ENTERTAINMENT_ACTIVITIES,
  TRANSPORTATION,
  TRAVEL_FEES_SERVICES,
  OTHER,
];

// Type exports
export type LangKeys = 'en' | 'ru' | 'fr' | 'es';

export type ExpenseKind = {
  id: number;
  orderNo?: number;
  code: string;
  canSchedule?: boolean;
  isMaintenance?: boolean;
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

// Helpers
export const getAllExpenseKinds = (): ExpenseKind[] =>
  expenseCategoriesWithKinds.flatMap((category) => category.expenseKinds);

export const getExpenseKindsByCategoryId = (categoryId: number): ExpenseKind[] =>
  expenseCategoriesWithKinds.find((c) => c.id === categoryId)?.expenseKinds ?? [];

export const getCategoryByExpenseKindId = (expenseKindId: number): ExpenseCategory | undefined =>
  expenseCategoriesWithKinds.find((category) => category.expenseKinds.some((kind) => kind.id === expenseKindId));

export const getExpenseKindByCode = (code: string): ExpenseKind | undefined =>
  getAllExpenseKinds().find((kind) => kind.code === code);

export const getLocalizedName = (item: { langs: Record<LangKeys, string> }, lang: LangKeys = 'en'): string =>
  item.langs[lang] ?? item.langs.en;

export const getOrderNo = (item: { orderNo?: number }, index: number): number =>
  item.orderNo ?? (index + 1) * 10;

export const isSchedulable = (kind: ExpenseKind): boolean => kind.canSchedule ?? false;
export const isMaintenanceKind = (kind: ExpenseKind): boolean => kind.isMaintenance ?? false;