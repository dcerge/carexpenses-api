import { BaseCore, BaseCorePropsInterface } from '@sdflc/backend-helpers';

/**
 * Base Core File for the project to be able to add commong methods if needed
 */
class AppCore extends BaseCore {
  constructor(props: BaseCorePropsInterface) {
    super(props);
  }

  public now() {
    return new Date();
  }
}

export { AppCore };
