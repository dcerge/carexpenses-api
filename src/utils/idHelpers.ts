import { v4 } from 'uuid';

export const generateId = () => {
  const id = v4();
  return id;
};

export const systemId = '00000000-0000-0000-0000-000000000000';
