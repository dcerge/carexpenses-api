import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';
import { castArray } from 'lodash';
import isUUID from 'is-uuid';
import { TRAVEL_STATUS } from '../../database';

export const rulesMultipleUuidInId = (key?: string) => {
  return {
    [key ?? 'id']: [
      {
        rule: 'array',
        message: 'IDs should be an array of UUIDs',
      },
      {
        rule: (values: any) => {
          const opResult = new OpResult();

          castArray(values).forEach((value, idx) => {
            if (!isUUID.v4(value)) {
              opResult.addError('id', `The id[${idx}] should be a UUID of version 4`);
            }
          });

          if (opResult.hasErrors()) {
            opResult.setCode(OP_RESULT_CODES.VALIDATION_FAILED);
            throw opResult;
          }
        },
      },
    ],
  };
};

export const rulePlanId = () => {
  return {
    planId: [
      {
        rule: 'required',
        message: 'Plans is required',
      },
      {
        rule: 'uuid',
        message: 'Plan ID should be a valid UUID identifier',
      },
    ],
  };
};

export const ruleStatus = () => {
  return {
    status: [
      {
        rule: 'integer',
        message: 'Status should be an integer',
      },
      {
        rule: function (value) {
          const supportedStatuses = [0, 100];
          if (supportedStatuses.includes(Number(value)) == false) {
            throw new Error(`Allowed status value is one of: ${supportedStatuses.join(', ')}`);
          }
        },
      },
    ],
  };
};

export const ruleTravelStatus = () => {
  return {
    status: [
      {
        rule: 'integer',
        message: 'Travel should be an integer',
      },
      {
        rule: function (value) {
          const supportedStatuses = Object.values(TRAVEL_STATUS);
          if (supportedStatuses.includes(Number(value)) == false) {
            throw new Error(`Allowed travel status value is one of: ${supportedStatuses.join(', ')}`);
          }
        },
      },
    ],
  };
};

export const ruleEventStatus = () => {
  return {
    status: [
      {
        rule: 'integer',
        message: 'Event status should be an integer',
      },
      {
        rule: function (value) {
          const supportedStatuses = [0, 50, 100];
          if (supportedStatuses.includes(Number(value)) == false) {
            throw new Error(`Allowed event status value is one of: ${supportedStatuses.join(', ')}`);
          }
        },
      },
    ],
  };
};

export const ruleCapacity = () => {
  return {
    capacity: [
      {
        rule: 'integer',
        message: 'Capacity should be an integer',
      },
      {
        rule: function (value) {
          if (value != null && Number(value) < 1) {
            throw new Error(`Room capacity should be above zero`);
          }
        },
      },
    ],
  };
};

export const ruleFootageSqm = () => {
  return {
    footageSqm: [
      {
        rule: 'integer',
        message: 'Footage square meters should be a number',
      },
      {
        rule: function (value) {
          if (value != null && Number(value) < 1) {
            throw new Error(`Room footage should be above zero`);
          }
        },
      },
    ],
  };
};

export const ruleDurationSeconds = () => {
  return {
    footageSqm: [
      {
        rule: 'integer',
        message: 'Duration in seconds should be an integer',
      },
      {
        rule: function (value) {
          if (value != null && Number(value) < 1) {
            throw new Error(`Duration should be above zero`);
          }
        },
      },
    ],
  };
};

export const ruleContentBlockFileUrl = () => {
  return {
    fileUrl: [
      {
        rule: 'url',
        message: 'File URL should be a valid URL',
      },
      {
        rule: 'maxLength:512',
        message: 'URL length should be less than 512',
      },
      // TODO: Figure out as to work with this as params and context are empty
      // {
      //   rule: function (value, params, context) {
      //     const contentType = params.contentType?.toLowerCase();
      //     if (!value && ['image'].includes(contentType) == false) {
      //       throw new Error(`Image is required`);
      //     }
      //   },
      // },
    ],
  };
};

export const ruleProgressStyle = () => {
  return {
    progressStyle: [
      {
        rule: 'string',
        message: 'Progerss style should be a string',
      },
      {
        rule: function (value) {
          const supportedStatuses = ['none', 'bar', 'dots', 'minimal'];
          if (supportedStatuses.includes(value?.toLowerCase()) == false) {
            throw new Error(`Allowed progress style value is one of: ${supportedStatuses.join(', ')}`);
          }
        },
      },
    ],
  };
};
