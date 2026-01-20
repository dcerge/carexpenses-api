// ./src/core/GloveboxDocTypeCore.ts
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/gloveboxDocTypeValidators';

class GloveboxDocTypeCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'gloveboxDocTypeGw',
      name: 'GloveboxDocType',
      hasOrderNo: true,
      doAuth: false, // Public lookup data
      doingWhat: {
        list: 'listing glovebox document types',
        get: 'getting a glovebox document type',
        getMany: 'getting multiple glovebox document types',
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

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  /**
   * Enrich document type with localized fields
   */
  private async enrichWithL10N(item: any, lang: string): Promise<any> {
    if (!item) return item;

    const l10nId = `${item.id}-${lang}`;
    const l10n = await this.getGateways().gloveboxDocTypeL10NGw.get(l10nId);

    if (l10n) {
      item.name = l10n.name;
      item.description = l10n.description;
      item.documentNumberLabel = l10n.documentNumberLabel;
    }

    return item;
  }

  /**
   * Batch enrich multiple items with localized fields
   */
  private async batchEnrichWithL10N(items: any[], lang: string): Promise<any[]> {
    if (!items || items.length === 0) return items;

    // Fetch all L10N records in a single query
    const l10nIds = items.map((item) => `${item.id}-${lang}`);
    const l10nRecords = await this.getGateways().gloveboxDocTypeL10NGw.list({
      filter: { id: l10nIds },
    });

    // Create lookup map
    const l10nMap = new Map<string, any>();
    for (const l10n of l10nRecords) {
      l10nMap.set(l10n.id, l10n);
    }

    // Enrich items
    return items.map((item) => {
      const l10n = l10nMap.get(`${item.id}-${lang}`);
      if (l10n) {
        item.name = l10n.name;
        item.description = l10n.description;
        item.documentNumberLabel = l10n.documentNumberLabel;
      }
      return item;
    });
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const lang = this.getContext().lang || 'en';
    return this.batchEnrichWithL10N(items, lang);
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) return item;

    const lang = this.getContext().lang || 'en';
    return this.enrichWithL10N(item, lang);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const lang = this.getContext().lang || 'en';
    return this.batchEnrichWithL10N(items, lang);
  }
}

export { GloveboxDocTypeCore };