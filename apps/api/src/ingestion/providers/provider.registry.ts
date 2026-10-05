import { Injectable } from '@nestjs/common';
import type { DataProvider, ProviderId } from './data-provider';
import { DemoProvider } from './demo.provider';
import { TcgdexProvider } from './tcgdex.provider';

@Injectable()
export class ProviderRegistry {
  constructor(
    private readonly demo: DemoProvider,
    private readonly tcgdex: TcgdexProvider,
  ) {}

  get(id: ProviderId): DataProvider {
    if (id === 'DEMO') {
      return this.demo;
    }
    return this.tcgdex;
  }
}
