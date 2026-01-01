import { logger } from '../logger';

class EventHelpers {
  public async registerEvent(name, args) {
    logger.log(`Event '${name}':'`, args);
  }
}

const eventHelpers = new EventHelpers();

export { eventHelpers, EventHelpers };
