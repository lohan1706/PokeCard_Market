// Import borné déjà exécuté pour base1, en français, avec un plafond de 20.
// Le drapeau TCGdex n'est activé que dans ce processus. Ne pas le copier dans .env.
// Ne pas changer setCode et ne pas suivre nextCursor.
import { PrismaService } from '../src/prisma/prisma.service';
import { DemoProvider } from '../src/ingestion/providers/demo.provider';
import { ProviderRegistry } from '../src/ingestion/providers/provider.registry';
import { TcgdexHttp } from '../src/ingestion/providers/tcgdex.http';
import { TcgdexProvider } from '../src/ingestion/providers/tcgdex.provider';
import { SyncService } from '../src/ingestion/sync/sync.service';
import { CatalogUpsertService } from '../src/ingestion/upsert/catalog-upsert.service';

process.env.TCGDEX_SYNC_ENABLED = 'true';

const body = { provider: 'TCGDEX' as const, setCode: 'base1', limit: 20, language: 'fr' };

async function main(): Promise<void> {
  const prisma = new PrismaService();
  await prisma.$connect();
  const sync = new SyncService(
    prisma,
    new ProviderRegistry(new DemoProvider(), new TcgdexProvider(new TcgdexHttp())),
    new CatalogUpsertService(prisma),
  );
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: 'camille.admin@demo.pokecard.local' },
  });
  const seedBefore = await prisma.card.findMany({
    where: { externalId: { startsWith: 'demo:' } },
    select: { externalId: true, name: true, updatedAt: true },
    orderBy: { externalId: 'asc' },
  });

  const sets = await sync.syncSets(admin.id, body);
  const cards = await sync.syncCards(admin.id, body);
  const prices = await sync.syncPrices(admin.id, body);

  const seedAfter = await prisma.card.findMany({
    where: { externalId: { startsWith: 'demo:' } },
    select: { externalId: true, name: true, updatedAt: true },
    orderBy: { externalId: 'asc' },
  });

  console.log(
    JSON.stringify(
      {
        sets,
        cards,
        prices,
        seedUnchanged: JSON.stringify(seedBefore) === JSON.stringify(seedAfter),
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

void main();
