export const GLOVEBOX_DOC_CATEGORIES = {
  VEHICLE: 'vehicle',
  DRIVER: 'driver',
  OTHER: 'other',
} as const;

export type GloveboxDocCategory = (typeof GLOVEBOX_DOC_CATEGORIES)[keyof typeof GLOVEBOX_DOC_CATEGORIES];

export interface GloveboxDocTypeLang {
  name: string;
  description?: string;
  documentNumberLabel?: string;
}

export interface GloveboxDocTypeData {
  id: number;
  orderNo: number;
  code: string;
  category: GloveboxDocCategory;
  hasDocumentNumber: boolean;
  hasIssueDate: boolean;
  hasEffectiveDate: boolean;
  hasExpiration: boolean;
  hasIssuingAuthority: boolean;
  hasCost: boolean;
  hasCoverageAmount: boolean;
  documentNumberLabelKey?: string;
  langs: {
    en: GloveboxDocTypeLang;
    ru: GloveboxDocTypeLang;
    fr: GloveboxDocTypeLang;
    es: GloveboxDocTypeLang;
  };
}

export const gloveboxDocTypes: GloveboxDocTypeData[] = [
  // ===========================================================================
  // VEHICLE DOCUMENTS (1-99)
  // ===========================================================================
  {
    id: 1,
    orderNo: 10,
    code: 'REGISTRATION',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'registrationNumber',
    langs: {
      en: {
        name: 'Registration Certificate',
        description: 'Vehicle registration document issued by DMV or transport authority',
        documentNumberLabel: 'Registration Number',
      },
      ru: {
        name: 'Свидетельство о регистрации',
        description: 'Свидетельство о регистрации транспортного средства (СТС)',
        documentNumberLabel: 'Регистрационный номер',
      },
      fr: {
        name: "Certificat d'immatriculation",
        description: "Carte grise du véhicule délivrée par la préfecture",
        documentNumberLabel: "Numéro d'immatriculation",
      },
      es: {
        name: 'Permiso de circulación',
        description: 'Documento de registro del vehículo emitido por la autoridad de tránsito',
        documentNumberLabel: 'Número de registro',
      },
    },
  },
  {
    id: 2,
    orderNo: 20,
    code: 'INSURANCE_POLICY',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: false,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: true,
    documentNumberLabelKey: 'policyNumber',
    langs: {
      en: {
        name: 'Insurance Policy',
        description: 'Full vehicle insurance policy document',
        documentNumberLabel: 'Policy Number',
      },
      ru: {
        name: 'Страховой полис',
        description: 'Полис страхования транспортного средства (ОСАГО/КАСКО)',
        documentNumberLabel: 'Номер полиса',
      },
      fr: {
        name: "Police d'assurance",
        description: "Document complet de la police d'assurance automobile",
        documentNumberLabel: 'Numéro de police',
      },
      es: {
        name: 'Póliza de seguro',
        description: 'Documento completo de la póliza de seguro del vehículo',
        documentNumberLabel: 'Número de póliza',
      },
    },
  },
  {
    id: 3,
    orderNo: 30,
    code: 'INSURANCE_CARD',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: false,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: false,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'policyNumber',
    langs: {
      en: {
        name: 'Insurance Card',
        description: 'Proof of insurance card to carry in vehicle',
        documentNumberLabel: 'Policy Number',
      },
      ru: {
        name: 'Страховая карточка',
        description: 'Карточка-подтверждение страхования для хранения в автомобиле',
        documentNumberLabel: 'Номер полиса',
      },
      fr: {
        name: "Carte verte d'assurance",
        description: "Attestation d'assurance à conserver dans le véhicule",
        documentNumberLabel: 'Numéro de police',
      },
      es: {
        name: 'Tarjeta de seguro',
        description: 'Comprobante de seguro para llevar en el vehículo',
        documentNumberLabel: 'Número de póliza',
      },
    },
  },
  {
    id: 4,
    orderNo: 40,
    code: 'TITLE',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: false,
    hasIssuingAuthority: true,
    hasCost: false,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'titleNumber',
    langs: {
      en: {
        name: 'Title / Ownership Certificate',
        description: 'Legal document proving vehicle ownership',
        documentNumberLabel: 'Title Number',
      },
      ru: {
        name: 'Паспорт транспортного средства',
        description: 'ПТС - документ, подтверждающий право собственности на автомобиль',
        documentNumberLabel: 'Номер ПТС',
      },
      fr: {
        name: 'Titre de propriété',
        description: 'Document légal prouvant la propriété du véhicule',
        documentNumberLabel: 'Numéro de titre',
      },
      es: {
        name: 'Título de propiedad',
        description: 'Documento legal que acredita la propiedad del vehículo',
        documentNumberLabel: 'Número de título',
      },
    },
  },
  {
    id: 5,
    orderNo: 50,
    code: 'SAFETY_INSPECTION',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'inspectionNumber',
    langs: {
      en: {
        name: 'Safety Inspection Certificate',
        description: 'Certificate confirming vehicle passed safety inspection',
        documentNumberLabel: 'Inspection Number',
      },
      ru: {
        name: 'Диагностическая карта',
        description: 'Документ о прохождении технического осмотра',
        documentNumberLabel: 'Номер карты',
      },
      fr: {
        name: 'Contrôle technique',
        description: 'Certificat de contrôle technique du véhicule',
        documentNumberLabel: "Numéro d'inspection",
      },
      es: {
        name: 'Inspección técnica vehicular',
        description: 'Certificado de inspección técnica del vehículo (ITV)',
        documentNumberLabel: 'Número de inspección',
      },
    },
  },
  {
    id: 6,
    orderNo: 60,
    code: 'EMISSIONS_TEST',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'testNumber',
    langs: {
      en: {
        name: 'Emissions Test Certificate',
        description: 'Certificate confirming vehicle passed emissions testing',
        documentNumberLabel: 'Test Number',
      },
      ru: {
        name: 'Сертификат экологического контроля',
        description: 'Документ о прохождении проверки на токсичность выхлопа',
        documentNumberLabel: 'Номер сертификата',
      },
      fr: {
        name: "Certificat de contrôle des émissions",
        description: 'Certificat de conformité aux normes antipollution',
        documentNumberLabel: 'Numéro de test',
      },
      es: {
        name: 'Certificado de emisiones',
        description: 'Certificado de verificación de emisiones contaminantes',
        documentNumberLabel: 'Número de prueba',
      },
    },
  },
  {
    id: 7,
    orderNo: 70,
    code: 'WARRANTY',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: false,
    hasCoverageAmount: true,
    documentNumberLabelKey: 'warrantyNumber',
    langs: {
      en: {
        name: 'Warranty Document',
        description: 'Manufacturer warranty certificate',
        documentNumberLabel: 'Warranty ID',
      },
      ru: {
        name: 'Гарантийный талон',
        description: 'Гарантийное свидетельство от производителя',
        documentNumberLabel: 'Номер гарантии',
      },
      fr: {
        name: 'Certificat de garantie',
        description: 'Garantie constructeur du véhicule',
        documentNumberLabel: 'Numéro de garantie',
      },
      es: {
        name: 'Documento de garantía',
        description: 'Certificado de garantía del fabricante',
        documentNumberLabel: 'Número de garantía',
      },
    },
  },
  {
    id: 8,
    orderNo: 80,
    code: 'EXTENDED_WARRANTY',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: true,
    documentNumberLabelKey: 'warrantyNumber',
    langs: {
      en: {
        name: 'Extended Warranty',
        description: 'Extended or additional warranty coverage',
        documentNumberLabel: 'Contract Number',
      },
      ru: {
        name: 'Расширенная гарантия',
        description: 'Дополнительная гарантия сверх заводской',
        documentNumberLabel: 'Номер контракта',
      },
      fr: {
        name: 'Garantie prolongée',
        description: 'Extension de garantie ou garantie complémentaire',
        documentNumberLabel: 'Numéro de contrat',
      },
      es: {
        name: 'Garantía extendida',
        description: 'Cobertura de garantía adicional o extendida',
        documentNumberLabel: 'Número de contrato',
      },
    },
  },
  {
    id: 9,
    orderNo: 90,
    code: 'PURCHASE_AGREEMENT',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: false,
    hasIssuingAuthority: false,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'contractNumber',
    langs: {
      en: {
        name: 'Purchase Agreement',
        description: 'Vehicle purchase contract from dealer or private sale',
        documentNumberLabel: 'Contract Number',
      },
      ru: {
        name: 'Договор купли-продажи',
        description: 'Договор приобретения транспортного средства',
        documentNumberLabel: 'Номер договора',
      },
      fr: {
        name: "Contrat d'achat",
        description: "Contrat d'achat du véhicule auprès d'un concessionnaire ou particulier",
        documentNumberLabel: 'Numéro de contrat',
      },
      es: {
        name: 'Contrato de compraventa',
        description: 'Contrato de compra del vehículo de concesionario o particular',
        documentNumberLabel: 'Número de contrato',
      },
    },
  },
  {
    id: 10,
    orderNo: 100,
    code: 'BILL_OF_SALE',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: false,
    hasIssuingAuthority: false,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'documentNumber',
    langs: {
      en: {
        name: 'Bill of Sale',
        description: 'Receipt documenting vehicle sale transaction',
        documentNumberLabel: 'Document Number',
      },
      ru: {
        name: 'Акт приёма-передачи',
        description: 'Документ, подтверждающий передачу транспортного средства',
        documentNumberLabel: 'Номер документа',
      },
      fr: {
        name: 'Acte de vente',
        description: 'Document attestant la transaction de vente du véhicule',
        documentNumberLabel: 'Numéro de document',
      },
      es: {
        name: 'Factura de venta',
        description: 'Recibo que documenta la transacción de venta del vehículo',
        documentNumberLabel: 'Número de documento',
      },
    },
  },
  {
    id: 11,
    orderNo: 110,
    code: 'LOAN_AGREEMENT',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'loanNumber',
    langs: {
      en: {
        name: 'Loan Agreement',
        description: 'Vehicle financing or loan contract',
        documentNumberLabel: 'Loan Number',
      },
      ru: {
        name: 'Кредитный договор',
        description: 'Договор автокредитования',
        documentNumberLabel: 'Номер кредита',
      },
      fr: {
        name: 'Contrat de prêt',
        description: 'Contrat de financement ou crédit automobile',
        documentNumberLabel: 'Numéro de prêt',
      },
      es: {
        name: 'Contrato de préstamo',
        description: 'Contrato de financiamiento del vehículo',
        documentNumberLabel: 'Número de préstamo',
      },
    },
  },
  {
    id: 12,
    orderNo: 120,
    code: 'LEASE_AGREEMENT',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'leaseNumber',
    langs: {
      en: {
        name: 'Lease Agreement',
        description: 'Vehicle lease contract',
        documentNumberLabel: 'Lease Number',
      },
      ru: {
        name: 'Договор лизинга',
        description: 'Договор аренды транспортного средства с правом выкупа',
        documentNumberLabel: 'Номер договора',
      },
      fr: {
        name: 'Contrat de location',
        description: 'Contrat de location longue durée (LLD) ou leasing',
        documentNumberLabel: 'Numéro de contrat',
      },
      es: {
        name: 'Contrato de arrendamiento',
        description: 'Contrato de leasing del vehículo',
        documentNumberLabel: 'Número de contrato',
      },
    },
  },
  {
    id: 13,
    orderNo: 130,
    code: 'ROADSIDE_ASSISTANCE',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: false,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'membershipNumber',
    langs: {
      en: {
        name: 'Roadside Assistance Card',
        description: 'Roadside assistance or breakdown service membership',
        documentNumberLabel: 'Membership Number',
      },
      ru: {
        name: 'Карта помощи на дороге',
        description: 'Членство в службе помощи на дороге',
        documentNumberLabel: 'Номер членства',
      },
      fr: {
        name: "Carte d'assistance routière",
        description: "Adhésion à un service d'assistance et dépannage",
        documentNumberLabel: "Numéro d'adhérent",
      },
      es: {
        name: 'Tarjeta de asistencia en carretera',
        description: 'Membresía de servicio de asistencia en carretera',
        documentNumberLabel: 'Número de membresía',
      },
    },
  },
  {
    id: 14,
    orderNo: 140,
    code: 'PARKING_PERMIT',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'permitNumber',
    langs: {
      en: {
        name: 'Parking Permit',
        description: 'Residential, workplace, or special parking permit',
        documentNumberLabel: 'Permit Number',
      },
      ru: {
        name: 'Парковочное разрешение',
        description: 'Разрешение на парковку (резидентное, рабочее или специальное)',
        documentNumberLabel: 'Номер разрешения',
      },
      fr: {
        name: 'Permis de stationnement',
        description: 'Autorisation de stationnement résidentiel ou professionnel',
        documentNumberLabel: 'Numéro de permis',
      },
      es: {
        name: 'Permiso de estacionamiento',
        description: 'Permiso de estacionamiento residencial, laboral o especial',
        documentNumberLabel: 'Número de permiso',
      },
    },
  },
  {
    id: 15,
    orderNo: 150,
    code: 'TOLL_TRANSPONDER',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: false,
    hasIssuingAuthority: true,
    hasCost: false,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'transponderNumber',
    langs: {
      en: {
        name: 'Toll Transponder Registration',
        description: 'Electronic toll collection device registration',
        documentNumberLabel: 'Transponder Number',
      },
      ru: {
        name: 'Транспондер для оплаты проезда',
        description: 'Регистрация устройства электронной оплаты проезда',
        documentNumberLabel: 'Номер транспондера',
      },
      fr: {
        name: 'Badge de télépéage',
        description: "Enregistrement du badge de télépéage (Liber-t, etc.)",
        documentNumberLabel: 'Numéro de badge',
      },
      es: {
        name: 'Dispositivo de telepeaje',
        description: 'Registro del dispositivo de cobro electrónico de peaje',
        documentNumberLabel: 'Número de dispositivo',
      },
    },
  },
  {
    id: 16,
    orderNo: 160,
    code: 'IMPORT_DOCUMENT',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: false,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'declarationNumber',
    langs: {
      en: {
        name: 'Import Documentation',
        description: 'Customs declaration and import documents for vehicle',
        documentNumberLabel: 'Declaration Number',
      },
      ru: {
        name: 'Таможенная декларация',
        description: 'Документы о ввозе транспортного средства',
        documentNumberLabel: 'Номер декларации',
      },
      fr: {
        name: "Documents d'importation",
        description: 'Déclaration douanière et documents d\'importation du véhicule',
        documentNumberLabel: 'Numéro de déclaration',
      },
      es: {
        name: 'Documentación de importación',
        description: 'Declaración aduanera y documentos de importación del vehículo',
        documentNumberLabel: 'Número de declaración',
      },
    },
  },
  {
    id: 17,
    orderNo: 170,
    code: 'RECALL_NOTICE',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: false,
    hasIssuingAuthority: true,
    hasCost: false,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'recallNumber',
    langs: {
      en: {
        name: 'Recall Notice',
        description: 'Manufacturer safety recall notification',
        documentNumberLabel: 'Recall Number',
      },
      ru: {
        name: 'Уведомление об отзыве',
        description: 'Уведомление производителя об отзывной кампании',
        documentNumberLabel: 'Номер отзыва',
      },
      fr: {
        name: 'Avis de rappel',
        description: 'Notification de rappel de sécurité du constructeur',
        documentNumberLabel: 'Numéro de rappel',
      },
      es: {
        name: 'Aviso de retiro',
        description: 'Notificación de retiro de seguridad del fabricante',
        documentNumberLabel: 'Número de retiro',
      },
    },
  },
  {
    id: 18,
    orderNo: 180,
    code: 'VIGNETTE',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'vignetteNumber',
    langs: {
      en: {
        name: 'Road Tax Vignette',
        description: 'Highway or road tax sticker (common in Europe)',
        documentNumberLabel: 'Vignette Number',
      },
      ru: {
        name: 'Виньетка',
        description: 'Наклейка об оплате дорожного сбора',
        documentNumberLabel: 'Номер виньетки',
      },
      fr: {
        name: 'Vignette autoroutière',
        description: 'Vignette de taxe routière (Suisse, Autriche, etc.)',
        documentNumberLabel: 'Numéro de vignette',
      },
      es: {
        name: 'Viñeta de autopista',
        description: 'Pegatina de impuesto de circulación (común en Europa)',
        documentNumberLabel: 'Número de viñeta',
      },
    },
  },
  {
    id: 19,
    orderNo: 190,
    code: 'ENVIRONMENTAL_STICKER',
    category: GLOVEBOX_DOC_CATEGORIES.VEHICLE,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: false,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'stickerNumber',
    langs: {
      en: {
        name: 'Environmental Sticker',
        description: 'Low emission zone access sticker (Crit\'Air, Umweltplakette)',
        documentNumberLabel: 'Sticker Number',
      },
      ru: {
        name: 'Экологический стикер',
        description: 'Наклейка для въезда в зоны с ограничением выбросов',
        documentNumberLabel: 'Номер стикера',
      },
      fr: {
        name: "Vignette Crit'Air",
        description: "Certificat qualité de l'air pour zones à faibles émissions",
        documentNumberLabel: 'Numéro de vignette',
      },
      es: {
        name: 'Distintivo ambiental',
        description: 'Etiqueta de acceso a zonas de bajas emisiones',
        documentNumberLabel: 'Número de distintivo',
      },
    },
  },

  // ===========================================================================
  // DRIVER DOCUMENTS (100-199)
  // ===========================================================================
  {
    id: 100,
    orderNo: 1000,
    code: 'DRIVERS_LICENSE',
    category: GLOVEBOX_DOC_CATEGORIES.DRIVER,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'licenseNumber',
    langs: {
      en: {
        name: "Driver's License",
        description: 'Standard driver\'s license issued by state or country',
        documentNumberLabel: 'License Number',
      },
      ru: {
        name: 'Водительское удостоверение',
        description: 'Национальное водительское удостоверение',
        documentNumberLabel: 'Номер удостоверения',
      },
      fr: {
        name: 'Permis de conduire',
        description: 'Permis de conduire national',
        documentNumberLabel: 'Numéro de permis',
      },
      es: {
        name: 'Licencia de conducir',
        description: 'Licencia de conducir emitida por el estado o país',
        documentNumberLabel: 'Número de licencia',
      },
    },
  },
  {
    id: 101,
    orderNo: 1010,
    code: 'INTERNATIONAL_PERMIT',
    category: GLOVEBOX_DOC_CATEGORIES.DRIVER,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'permitNumber',
    langs: {
      en: {
        name: 'International Driving Permit',
        description: 'IDP for driving in foreign countries',
        documentNumberLabel: 'Permit Number',
      },
      ru: {
        name: 'Международное водительское удостоверение',
        description: 'МВУ для управления автомобилем за рубежом',
        documentNumberLabel: 'Номер удостоверения',
      },
      fr: {
        name: 'Permis de conduire international',
        description: 'PCI pour conduire à l\'étranger',
        documentNumberLabel: 'Numéro de permis',
      },
      es: {
        name: 'Permiso internacional de conducir',
        description: 'PIC para conducir en países extranjeros',
        documentNumberLabel: 'Número de permiso',
      },
    },
  },
  {
    id: 102,
    orderNo: 1020,
    code: 'COMMERCIAL_LICENSE',
    category: GLOVEBOX_DOC_CATEGORIES.DRIVER,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'licenseNumber',
    langs: {
      en: {
        name: 'Commercial Driver\'s License (CDL)',
        description: 'License for operating commercial vehicles',
        documentNumberLabel: 'CDL Number',
      },
      ru: {
        name: 'Удостоверение на категорию C/D/E',
        description: 'Права на управление грузовым или пассажирским транспортом',
        documentNumberLabel: 'Номер удостоверения',
      },
      fr: {
        name: 'Permis poids lourd',
        description: 'Permis pour véhicules commerciaux (catégories C, D, E)',
        documentNumberLabel: 'Numéro de permis',
      },
      es: {
        name: 'Licencia de conducir comercial',
        description: 'Licencia para operar vehículos comerciales',
        documentNumberLabel: 'Número de licencia',
      },
    },
  },
  {
    id: 103,
    orderNo: 1030,
    code: 'MOTORCYCLE_ENDORSEMENT',
    category: GLOVEBOX_DOC_CATEGORIES.DRIVER,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'endorsementNumber',
    langs: {
      en: {
        name: 'Motorcycle Endorsement',
        description: 'Motorcycle riding endorsement or separate license',
        documentNumberLabel: 'Endorsement Number',
      },
      ru: {
        name: 'Категория A (мотоцикл)',
        description: 'Право на управление мотоциклом',
        documentNumberLabel: 'Номер удостоверения',
      },
      fr: {
        name: 'Permis moto (catégorie A)',
        description: 'Permis de conduire pour motocyclettes',
        documentNumberLabel: 'Numéro de permis',
      },
      es: {
        name: 'Permiso de motocicleta',
        description: 'Endoso o licencia separada para motocicletas',
        documentNumberLabel: 'Número de endoso',
      },
    },
  },
  {
    id: 104,
    orderNo: 1040,
    code: 'MEDICAL_CERTIFICATE',
    category: GLOVEBOX_DOC_CATEGORIES.DRIVER,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'certificateNumber',
    langs: {
      en: {
        name: 'Medical Certificate',
        description: 'Medical fitness certificate for commercial drivers',
        documentNumberLabel: 'Certificate Number',
      },
      ru: {
        name: 'Медицинская справка',
        description: 'Справка о состоянии здоровья водителя',
        documentNumberLabel: 'Номер справки',
      },
      fr: {
        name: 'Certificat médical',
        description: "Certificat d'aptitude médicale pour conducteurs professionnels",
        documentNumberLabel: 'Numéro de certificat',
      },
      es: {
        name: 'Certificado médico',
        description: 'Certificado de aptitud médica para conductores comerciales',
        documentNumberLabel: 'Número de certificado',
      },
    },
  },
  {
    id: 105,
    orderNo: 1050,
    code: 'DEFENSIVE_DRIVING_CERT',
    category: GLOVEBOX_DOC_CATEGORIES.DRIVER,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'certificateNumber',
    langs: {
      en: {
        name: 'Defensive Driving Certificate',
        description: 'Certificate from defensive driving course completion',
        documentNumberLabel: 'Certificate Number',
      },
      ru: {
        name: 'Сертификат контраварийного вождения',
        description: 'Сертификат о прохождении курсов безопасного вождения',
        documentNumberLabel: 'Номер сертификата',
      },
      fr: {
        name: 'Certificat de conduite défensive',
        description: 'Attestation de stage de conduite préventive',
        documentNumberLabel: 'Numéro de certificat',
      },
      es: {
        name: 'Certificado de conducción defensiva',
        description: 'Certificado de finalización de curso de conducción defensiva',
        documentNumberLabel: 'Número de certificado',
      },
    },
  },
  {
    id: 106,
    orderNo: 1060,
    code: 'HAZMAT_ENDORSEMENT',
    category: GLOVEBOX_DOC_CATEGORIES.DRIVER,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'endorsementNumber',
    langs: {
      en: {
        name: 'Hazmat Endorsement',
        description: 'Endorsement for transporting hazardous materials',
        documentNumberLabel: 'Endorsement Number',
      },
      ru: {
        name: 'Допуск к перевозке опасных грузов',
        description: 'ДОПОГ-свидетельство на перевозку опасных грузов',
        documentNumberLabel: 'Номер свидетельства',
      },
      fr: {
        name: 'Certificat ADR',
        description: 'Autorisation de transport de matières dangereuses',
        documentNumberLabel: 'Numéro de certificat',
      },
      es: {
        name: 'Permiso de materiales peligrosos',
        description: 'Endoso para transportar materiales peligrosos',
        documentNumberLabel: 'Número de endoso',
      },
    },
  },
  {
    id: 107,
    orderNo: 1070,
    code: 'TAXI_LICENSE',
    category: GLOVEBOX_DOC_CATEGORIES.DRIVER,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: false,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: false,
    documentNumberLabelKey: 'licenseNumber',
    langs: {
      en: {
        name: 'Taxi/Rideshare License',
        description: 'License for taxi or rideshare driving',
        documentNumberLabel: 'License Number',
      },
      ru: {
        name: 'Лицензия такси',
        description: 'Разрешение на перевозку пассажиров легковым такси',
        documentNumberLabel: 'Номер лицензии',
      },
      fr: {
        name: 'Licence de taxi/VTC',
        description: 'Carte professionnelle de chauffeur de taxi ou VTC',
        documentNumberLabel: 'Numéro de licence',
      },
      es: {
        name: 'Licencia de taxi',
        description: 'Licencia para conducir taxi o servicio de transporte',
        documentNumberLabel: 'Número de licencia',
      },
    },
  },

  // ===========================================================================
  // OTHER DOCUMENTS (1000+)
  // ===========================================================================
  {
    id: 1000,
    orderNo: 10000,
    code: 'CUSTOM',
    category: GLOVEBOX_DOC_CATEGORIES.OTHER,
    hasDocumentNumber: true,
    hasIssueDate: true,
    hasEffectiveDate: true,
    hasExpiration: true,
    hasIssuingAuthority: true,
    hasCost: true,
    hasCoverageAmount: true,
    documentNumberLabelKey: 'documentNumber',
    langs: {
      en: {
        name: 'Custom Document',
        description: 'User-defined document type',
        documentNumberLabel: 'Document Number',
      },
      ru: {
        name: 'Другой документ',
        description: 'Пользовательский тип документа',
        documentNumberLabel: 'Номер документа',
      },
      fr: {
        name: 'Document personnalisé',
        description: 'Type de document défini par l\'utilisateur',
        documentNumberLabel: 'Numéro de document',
      },
      es: {
        name: 'Documento personalizado',
        description: 'Tipo de documento definido por el usuario',
        documentNumberLabel: 'Número de documento',
      },
    },
  },
];

export type GloveboxDocType = (typeof gloveboxDocTypes)[number];
export type GloveboxDocTypeCode = GloveboxDocType['code'];