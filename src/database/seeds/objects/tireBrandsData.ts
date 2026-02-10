// ./src/database/seeds/objects/tiresBrandData.ts
export const tireBrands = [
  { id: 1, name: 'BFGoodrich', website: 'https://www.bfgoodrich.com' },
  { id: 2, name: 'Bridgestone', website: 'https://www.bridgestone.com' },
  { id: 3, name: 'Continental', website: 'https://www.continental-tires.com' },
  { id: 4, name: 'Cooper', website: 'https://www.coopertire.com' },
  { id: 5, name: 'Dunlop', website: 'https://www.dunloptires.com' },
  { id: 6, name: 'Falken', website: 'https://www.falkentire.com' },
  { id: 7, name: 'Firestone', website: 'https://www.firestonetire.com' },
  { id: 8, name: 'General Tire', website: 'https://www.generaltire.com' },
  { id: 9, name: 'Goodyear', website: 'https://www.goodyear.com' },
  { id: 10, name: 'Hankook', website: 'https://www.hankooktire.com' },
  { id: 11, name: 'Kumho', website: 'https://www.kumhotire.com' },
  { id: 12, name: 'Maxxis', website: 'https://www.maxxis.com' },
  { id: 13, name: 'Michelin', website: 'https://www.michelin.com' },
  { id: 14, name: 'Nexen', website: 'https://www.nexentire.com' },
  { id: 15, name: 'Nitto', website: 'https://www.nittotire.com' },
  { id: 16, name: 'Nokian', website: 'https://www.nokiantires.com' },
  { id: 17, name: 'Pirelli', website: 'https://www.pirelli.com' },
  { id: 18, name: 'Sumitomo', website: 'https://www.sumitomotire.com' },
  { id: 19, name: 'Toyo', website: 'https://www.toyotires.com' },
  { id: 20, name: 'Uniroyal', website: 'https://www.uniroyal.com' },
  { id: 21, name: 'Yokohama', website: 'https://www.yokohamatire.com' },
  // Russian/CIS market brands
  { id: 22, name: 'Cordiant', website: 'https://www.cordiant.com' },
  { id: 23, name: 'Kama', website: 'https://www.kamatyres.com' },
  { id: 24, name: 'Viatti', website: 'https://www.viatti.com' },
  { id: 25, name: 'Amtel', website: null },
  // Budget/Value brands
  { id: 26, name: 'Westlake', website: 'https://www.westlaketire.com' },
  { id: 27, name: 'GT Radial', website: 'https://www.gtradial.com' },
  { id: 28, name: 'Sailun', website: 'https://www.sailuntire.com' },
  { id: 29, name: 'Triangle', website: 'https://www.triangletire.com' },
  { id: 30, name: 'Zeetex', website: 'https://www.zeetex.com' },
];

// Type exports
export type TireBrand = (typeof tireBrands)[number];

// Helper to get brand by id
export const getTireBrandById = (id: number): TireBrand | undefined => {
  return tireBrands.find((brand) => brand.id === id);
};

// Helper to search brands by name (case-insensitive)
export const searchTireBrands = (query: string): TireBrand[] => {
  const lowerQuery = query.toLowerCase();
  return tireBrands.filter((brand) => brand.name.toLowerCase().includes(lowerQuery));
};