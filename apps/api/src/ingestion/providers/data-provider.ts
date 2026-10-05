export const PROVIDER_IDS = ['DEMO', 'TCGDEX'] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type PageQuery = {
  cursor?: string | null;
  limit: number;
  setExternalId?: string;
  language?: string;
};

export type RawPage = {
  items: unknown[];
  nextCursor: string | null;
};

export interface DataProvider {
  readonly id: ProviderId;
  listSets(query: PageQuery): Promise<RawPage>;
  listCards(query: PageQuery): Promise<RawPage>;
  getCard(externalId: string): Promise<unknown | null>;
  listPrices(query: PageQuery): Promise<RawPage>;
}

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ProviderRequestError';
  }
}
