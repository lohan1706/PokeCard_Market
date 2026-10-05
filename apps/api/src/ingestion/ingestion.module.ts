import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { DemoProvider } from './providers/demo.provider';
import { ProviderRegistry } from './providers/provider.registry';
import { TcgdexHttp } from './providers/tcgdex.http';
import { TcgdexProvider } from './providers/tcgdex.provider';
import { SyncService } from './sync/sync.service';
import { CatalogUpsertService } from './upsert/catalog-upsert.service';

@Module({
  controllers: [IngestionController],
  providers: [
    DemoProvider,
    { provide: TcgdexHttp, useFactory: () => new TcgdexHttp() },
    TcgdexProvider,
    ProviderRegistry,
    CatalogUpsertService,
    SyncService,
  ],
})
export class IngestionModule {}
