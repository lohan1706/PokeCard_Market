import { Injectable } from '@nestjs/common';
import { TCGDEX_LANGUAGE_PATHS, mapLanguage } from '../domain/languages';
import { slicePage } from '../domain/numbers';
import {
  ProviderRequestError,
  type DataProvider,
  type PageQuery,
  type RawPage,
} from './data-provider';
import { TcgdexHttp } from './tcgdex.http';

const EXTERNAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class TcgdexProvider implements DataProvider {
  readonly id = 'TCGDEX' as const;

  constructor(private readonly http: TcgdexHttp) {}

  async listSets(query: PageQuery): Promise<RawPage> {
    const language = this.languagePath(query.language);
    if (query.setExternalId) {
      this.assertId(query.setExternalId);
      const one = await this.http.getJson(`/${language}/sets/${query.setExternalId}`);
      return { items: one ? [one] : [], nextCursor: null };
    }
    const list = await this.http.getJson(`/${language}/sets`);
    const items = Array.isArray(list) ? list : [];
    return slicePage(items, query.cursor, query.limit);
  }

  async listCards(query: PageQuery): Promise<RawPage> {
    if (!query.setExternalId) {
      throw new ProviderRequestError('setExternalId requis', false);
    }
    this.assertId(query.setExternalId);
    const language = this.languagePath(query.language);
    const set = await this.http.getJson(`/${language}/sets/${query.setExternalId}`);
    const briefs = isRecord(set) && Array.isArray(set.cards) ? set.cards : [];
    const page = slicePage(briefs, query.cursor, query.limit);
    const items: unknown[] = [];
    for (const brief of page.items) {
      const id = isRecord(brief) && typeof brief.id === 'string' ? brief.id : null;
      if (!id || !EXTERNAL_ID.test(id)) {
        items.push({ missing: true });
        continue;
      }
      const card = await this.http.getJson(`/${language}/cards/${id}`);
      items.push(card ?? { id, missing: true });
    }
    return { items, nextCursor: page.nextCursor };
  }

  async getCard(externalId: string): Promise<unknown | null> {
    this.assertId(externalId);
    return this.http.getJson(`/en/cards/${externalId}`);
  }

  listPrices(query: PageQuery): Promise<RawPage> {
    return this.listCards(query);
  }

  private languagePath(language: string | undefined): string {
    const internal = mapLanguage(language ?? 'fr');
    const path = internal ? TCGDEX_LANGUAGE_PATHS[internal] : undefined;
    if (!path) {
      throw new ProviderRequestError('langue non disponible', false);
    }
    return path;
  }

  private assertId(value: string): void {
    if (!EXTERNAL_ID.test(value)) {
      throw new ProviderRequestError('identifiant externe invalide', false);
    }
  }
}
