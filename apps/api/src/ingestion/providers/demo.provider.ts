import { Injectable } from '@nestjs/common';
import { demoRawCards, demoRawPrices, demoRawSets } from '../fixtures/demo-raw';
import { slicePage } from '../domain/numbers';
import type { DataProvider, PageQuery, RawPage } from './data-provider';

function matchesSet(
  item: { id: string; code: string },
  setExternalId: string | undefined,
): boolean {
  if (!setExternalId) {
    return true;
  }
  return item.id === setExternalId || item.code === setExternalId;
}

@Injectable()
export class DemoProvider implements DataProvider {
  readonly id = 'DEMO' as const;

  async listSets(query: PageQuery): Promise<RawPage> {
    const filtered = demoRawSets.filter((item) => matchesSet(item, query.setExternalId));
    return slicePage(filtered, query.cursor, query.limit);
  }

  async listCards(query: PageQuery): Promise<RawPage> {
    const filtered = demoRawCards.filter((item) =>
      matchesSet({ id: item.setId, code: item.setCode }, query.setExternalId),
    );
    return slicePage(filtered, query.cursor, query.limit);
  }

  async getCard(externalId: string): Promise<unknown | null> {
    return demoRawCards.find((item) => item.id === externalId) ?? null;
  }

  async listPrices(query: PageQuery): Promise<RawPage> {
    const cardIds = new Set(
      demoRawCards
        .filter((item) => matchesSet({ id: item.setId, code: item.setCode }, query.setExternalId))
        .map((item) => item.id),
    );
    const filtered = demoRawPrices.filter((item) => cardIds.has(item.cardId));
    return slicePage(filtered, query.cursor, query.limit);
  }
}
