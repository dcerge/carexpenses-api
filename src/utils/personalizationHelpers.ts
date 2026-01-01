import { omit } from 'lodash';

export const removeSystemFields = (obj: any): any => {
  if (!obj) {
    return obj;
  }

  return omit(obj, [
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    'removedAt',
    'removedBy',
    'version',
    'removedAtStr',
  ]);
};
