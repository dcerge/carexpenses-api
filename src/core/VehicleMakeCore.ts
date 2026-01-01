// ./src/core/VehicleMakeCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCorePropsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';

dayjs.extend(utc);

class VehicleMakeCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'vehicleMakeGw',
      name: 'Vehicle Make',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing vehicle makes',
        get: 'getting a car transmission type',
        getMany: 'getting multiple vehicle makes',
        create: '',
        createMany: '',
        update: '',
        updateMany: '',
        set: '',
        remove: '',
        removeMany: '',
      },
    });
  }
}

export { VehicleMakeCore };
