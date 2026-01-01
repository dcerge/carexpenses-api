export const normalizeName = (name: string): string => {
  return name?.trim().toLowerCase();
};

export const buildFullName = (user: any, defaultName: string) => {
  return user ? [user.firstName, user.lastName].join(' ').trim() : defaultName || 'N/A';
};
