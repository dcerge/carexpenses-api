import { OPERATION_RIGHTS, USER_ROLES } from '../boundary';
import { systemId } from '../utils';

/**
 * Checks what operation rights an email layout or template has for the current user
 * @param object An email layout or template object
 * @param context core's conext object with current userid, accountId, roleId
 * @returns
 */
export const checkEmailLayoutRights = (object, context) => {
  const { accountId } = object || {};
  const { roleId } = context || {};

  if (accountId === systemId) {
    if ([USER_ROLES.VIEWER, USER_ROLES.SUPPORT_AGENT].includes(roleId) === false) {
      return [OPERATION_RIGHTS.DUPLICATE];
    }
  } else if ([USER_ROLES.OWNER, USER_ROLES.ADMIN].includes(roleId)) {
    return [OPERATION_RIGHTS.UPDATE, OPERATION_RIGHTS.DUPLICATE, OPERATION_RIGHTS.REMOVE, OPERATION_RIGHTS.DUPLICATE];
  }

  return [];
};

export const checkFormsRights = (object, context) => {
  const { accountId, createdBy } = object || {};
  const { roleId, userId } = context || {};
  const rights: string[] = [];

  if (accountId === systemId) {
    if ([USER_ROLES.VIEWER, USER_ROLES.SUPPORT_AGENT].includes(roleId) === false) {
      rights.push(OPERATION_RIGHTS.DUPLICATE);
    }
  } else if ([USER_ROLES.OWNER, USER_ROLES.ADMIN].includes(roleId)) {
    rights.push(...[OPERATION_RIGHTS.UPDATE, OPERATION_RIGHTS.REMOVE, OPERATION_RIGHTS.DUPLICATE]);
  } else if ([USER_ROLES.MEMBER].includes(roleId)) {
    rights.push(OPERATION_RIGHTS.DUPLICATE);
    if (createdBy === userId) {
      rights.push(...[OPERATION_RIGHTS.UPDATE, OPERATION_RIGHTS.REMOVE, OPERATION_RIGHTS.DUPLICATE]);
    }
  }

  return rights;
};

export const checkSubmissionRights = (object, context) => {
  const { accountId, createdBy } = object || {};
  const { roleId, userId } = context || {};
  const rights: string[] = [];

  if ([USER_ROLES.SUPPORT_AGENT, USER_ROLES.OWNER, USER_ROLES.ADMIN].includes(roleId)) {
    rights.push(...[OPERATION_RIGHTS.UPDATE, OPERATION_RIGHTS.REMOVE]);
  }

  return rights;
};
