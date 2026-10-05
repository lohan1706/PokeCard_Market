import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { parseEnv } from '../../config/env.schema';
import { mapLanguage, type InternalLanguage } from '../domain/languages';
import { InvalidCursorError } from '../domain/numbers';
import type { NormalizedCard, NormalizedPrice, NormalizedSet } from '../domain/normalized';
import {
  normalizeDemoCard,
  normalizeDemoPrice,
  normalizeDemoSet,
} from '../normalize/demo.normalizer';
import {
  normalizeTcgdexCard,
  normalizeTcgdexPrices,
  normalizeTcgdexSet,
} from '../normalize/tcgdex.normalizer';
import { externalIdOf } from '../normalize/records';
import { ProviderRequestError, type ProviderId } from '../providers/data-provider';
import { ProviderRegistry } from '../providers/provider.registry';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CatalogUpsertService,
  type ItemFailure,
  type ItemStats,
  type Prepared,
} from '../upsert/catalog-upsert.service';
import { validateCard, validatePrice, validateSet } from '../validate/normalized.validator';
import type { SyncRequestDto } from '../dto/sync-request.dto';

const PROVIDER_ROWS = {
  DEMO: {
    name: 'Fournisseur de démonstration',
    defaultCurrency: 'USD',
    baseUrl: null,
  },
  TCGDEX: {
    name: 'TCGdex',
    defaultCurrency: 'EUR',
    baseUrl: 'https://api.tcgdex.net',
  },
} as const;

const VARIANTS = [
  { code: 'NORMAL', name: 'Normale', sortOrder: 1 },
  { code: 'HOLO', name: 'Holo', sortOrder: 2 },
  { code: 'REVERSE', name: 'Reverse', sortOrder: 3 },
  { code: 'FIRST_EDITION', name: 'First edition', sortOrder: 4 },
] as const;

export type SyncRunView = {
  id: string;
  provider: string;
  jobType: 'SETS' | 'CARDS' | 'PRICES';
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  setsSeen: number;
  cardsSeen: number;
  pricesWritten: number;
  skipped: number;
  errorsCount: number;
  error: string | null;
  nextCursor: string | null;
};

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly tcgdexEnabled = parseEnv(process.env).TCGDEX_SYNC_ENABLED;

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly upsert: CatalogUpsertService,
  ) {}

  syncSets(actorId: string, dto: SyncRequestDto): Promise<SyncRunView> {
    return this.run('SETS', actorId, dto);
  }

  syncCards(actorId: string, dto: SyncRequestDto): Promise<SyncRunView> {
    if (!dto.setCode) {
      throw new BadRequestException('setCode est requis pour cette synchronisation.');
    }
    return this.run('CARDS', actorId, dto);
  }

  syncPrices(actorId: string, dto: SyncRequestDto): Promise<SyncRunView> {
    if (!dto.setCode) {
      throw new BadRequestException('setCode est requis pour cette synchronisation.');
    }
    return this.run('PRICES', actorId, dto);
  }

  async status(): Promise<{ runs: SyncRunView[] }> {
    const runs = await this.prisma.ingestionRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { provider: { select: { code: true } } },
    });
    return { runs: runs.map((run) => presentRun(run, null)) };
  }

  async errors(runId?: string): Promise<{
    runId: string | null;
    errors: Array<{ id: string; externalId: string | null; message: string; createdAt: string }>;
    conflicts: Array<{
      id: string;
      externalId: string | null;
      reason: string;
      details: Prisma.JsonValue;
      createdAt: string;
    }>;
  }> {
    const run = runId
      ? await this.prisma.ingestionRun.findUnique({ where: { id: runId } })
      : await this.prisma.ingestionRun.findFirst({ orderBy: { startedAt: 'desc' } });
    if (!run) {
      if (runId) {
        throw new NotFoundException('Synchronisation introuvable.');
      }
      return { runId: null, errors: [], conflicts: [] };
    }
    const [errors, conflicts] = await Promise.all([
      this.prisma.ingestionError.findMany({
        where: { runId: run.id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.importConflict.findMany({
        where: { runId: run.id },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      runId: run.id,
      errors: errors.map((error) => ({
        id: error.id,
        externalId: error.externalId,
        message: error.message,
        createdAt: error.createdAt.toISOString(),
      })),
      conflicts: conflicts.map((conflict) => ({
        id: conflict.id,
        externalId: conflict.externalId,
        reason: conflict.reason,
        details: conflict.details,
        createdAt: conflict.createdAt.toISOString(),
      })),
    };
  }

  private async run(
    jobType: 'SETS' | 'CARDS' | 'PRICES',
    actorId: string,
    dto: SyncRequestDto,
  ): Promise<SyncRunView> {
    const providerId = dto.provider;
    if (providerId === 'TCGDEX' && !this.tcgdexEnabled) {
      throw new ConflictException('La synchronisation TCGdex réelle est désactivée.');
    }
    const language = mapLanguage(dto.language ?? 'fr');
    if (!language) {
      throw new BadRequestException('Langue non prise en charge.');
    }
    const providerRow = await this.ensureProvider(providerId);
    if (!providerRow.isActive) {
      throw new ConflictException('Cette source est désactivée.');
    }
    if (jobType === 'CARDS') {
      await this.ensureVariants();
    }

    const run = await this.prisma.ingestionRun.create({
      data: {
        providerId: providerRow.id,
        jobType,
        status: 'RUNNING',
      },
    });

    try {
      const provider = this.providers.get(providerId);
      const limit = dto.limit ?? 5;
      const query = {
        cursor: dto.cursor ?? null,
        limit,
        setExternalId: dto.setCode,
        language,
      };
      const overrides = await this.conditionOverrides(providerRow.id);
      let stats: ItemStats = {
        setsSeen: 0,
        cardsSeen: 0,
        pricesWritten: 0,
        skipped: 0,
        errorsCount: 0,
      };
      let nextCursor: string | null = null;
      const ctx = { runId: run.id, providerDbId: providerRow.id, providerCode: providerId };
      const now = new Date();

      if (jobType === 'SETS') {
        const page = await provider.listSets(query);
        nextCursor = page.nextCursor;
        const prepared = prepareSets(providerId, page.items, language, now);
        stats = await this.upsert.importSets(ctx, prepared.items, prepared.failures);
      } else if (jobType === 'CARDS') {
        const page = await provider.listCards(query);
        nextCursor = page.nextCursor;
        const prepared = prepareCards(providerId, page.items, language);
        stats = await this.upsert.importCards(ctx, prepared.items, prepared.failures);
      } else {
        const page = await provider.listPrices(query);
        nextCursor = page.nextCursor;
        const prepared = preparePrices(providerId, page.items, language, overrides, now);
        stats = await this.upsert.importPrices(ctx, prepared.items, prepared.failures);
      }

      const finished = await this.prisma.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCEEDED',
          finishedAt: new Date(),
          setsSeen: stats.setsSeen,
          cardsSeen: stats.cardsSeen,
          pricesWritten: stats.pricesWritten,
          skipped: stats.skipped,
          errorsCount: stats.errorsCount,
        },
        include: { provider: { select: { code: true } } },
      });
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action: `sync.${jobType.toLowerCase()}`,
          entityType: 'IngestionRun',
          entityId: run.id,
          metadata: {
            provider: providerId,
            setsSeen: stats.setsSeen,
            cardsSeen: stats.cardsSeen,
            pricesWritten: stats.pricesWritten,
            skipped: stats.skipped,
            errorsCount: stats.errorsCount,
          },
        },
      });
      this.logger.log(
        `sync ${jobType} ${providerId} sets=${stats.setsSeen} cards=${stats.cardsSeen} prices=${stats.pricesWritten} skipped=${stats.skipped}`,
      );
      return presentRun(finished, nextCursor);
    } catch (error) {
      const message = clip(error instanceof Error ? error.message : 'Erreur de synchronisation');
      const finished = await this.prisma.ingestionRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', finishedAt: new Date(), error: message },
        include: { provider: { select: { code: true } } },
      });
      if (error instanceof ProviderRequestError || error instanceof InvalidCursorError) {
        this.logger.warn(`sync ${jobType} ${providerId} failed`);
        return presentRun(finished, null);
      }
      this.logger.warn(`sync ${jobType} ${providerId} failed`);
      throw new BadRequestException('La synchronisation a échoué.');
    }
  }

  private async ensureProvider(id: ProviderId) {
    const definition = PROVIDER_ROWS[id];
    return this.prisma.priceProvider.upsert({
      where: { code: id },
      create: {
        code: id,
        name: definition.name,
        defaultCurrency: definition.defaultCurrency,
        baseUrl: definition.baseUrl,
        isActive: true,
      },
      update: {},
    });
  }

  private async ensureVariants(): Promise<void> {
    for (const variant of VARIANTS) {
      await this.prisma.variant.upsert({
        where: { code: variant.code },
        create: { ...variant, fallbackCoefficient: '1.0000' },
        update: {},
      });
    }
  }

  private async conditionOverrides(providerDbId: string): Promise<Map<string, string>> {
    const rows = await this.prisma.conditionMap.findMany({ where: { providerId: providerDbId } });
    return new Map(rows.map((row) => [row.externalValue.trim().toUpperCase(), row.internalCode]));
  }
}

function prepareSets(
  provider: ProviderId,
  raws: unknown[],
  language: InternalLanguage,
  now: Date,
): { items: Prepared<NormalizedSet>[]; failures: ItemFailure[] } {
  const items: Prepared<NormalizedSet>[] = [];
  const failures: ItemFailure[] = [];
  for (const raw of raws) {
    const normalized =
      provider === 'DEMO' ? normalizeDemoSet(raw) : normalizeTcgdexSet(raw, language);
    collect(items, failures, raw, normalized, (value) => validateSet(value, now));
  }
  return { items, failures };
}

function prepareCards(
  provider: ProviderId,
  raws: unknown[],
  language: InternalLanguage,
): { items: Prepared<NormalizedCard>[]; failures: ItemFailure[] } {
  const items: Prepared<NormalizedCard>[] = [];
  const failures: ItemFailure[] = [];
  for (const raw of raws) {
    const normalized =
      provider === 'DEMO' ? normalizeDemoCard(raw) : normalizeTcgdexCard(raw, language);
    collect(items, failures, raw, normalized, (value) => validateCard(value));
  }
  return { items, failures };
}

function preparePrices(
  provider: ProviderId,
  raws: unknown[],
  language: InternalLanguage,
  overrides: ReadonlyMap<string, string>,
  now: Date,
): { items: Prepared<NormalizedPrice>[]; failures: ItemFailure[] } {
  const items: Prepared<NormalizedPrice>[] = [];
  const failures: ItemFailure[] = [];
  for (const raw of raws) {
    if (provider === 'DEMO') {
      const normalized = normalizeDemoPrice(raw, overrides);
      collect(items, failures, raw, normalized, (value) => validatePrice(value, now));
      continue;
    }
    const normalized = normalizeTcgdexPrices(raw, language, now);
    for (const issue of normalized.issues) {
      failures.push({ externalId: normalized.externalId, message: issue, raw });
    }
    for (const price of normalized.prices) {
      const issues = validatePrice(price, now);
      if (issues.length > 0) {
        failures.push({ externalId: price.externalId, message: issues.join('; '), raw });
        continue;
      }
      items.push({ raw, value: price });
    }
  }
  return { items, failures };
}

function collect<T extends { externalId: string }>(
  items: Prepared<T>[],
  failures: ItemFailure[],
  raw: unknown,
  normalized: { ok: true; value: T } | { ok: false; externalId: string | null; issues: string[] },
  validate: (value: T) => string[],
): void {
  if (!normalized.ok) {
    failures.push({
      externalId: normalized.externalId ?? externalIdOf(raw),
      message: normalized.issues.join('; ') || 'Donnée invalide',
      raw,
    });
    return;
  }
  const issues = validate(normalized.value);
  if (issues.length > 0) {
    failures.push({ externalId: normalized.value.externalId, message: issues.join('; '), raw });
    return;
  }
  items.push({ raw, value: normalized.value });
}

function presentRun(
  run: {
    id: string;
    jobType: 'SETS' | 'CARDS' | 'PRICES';
    status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    startedAt: Date;
    finishedAt: Date | null;
    setsSeen: number;
    cardsSeen: number;
    pricesWritten: number;
    skipped: number;
    errorsCount: number;
    error: string | null;
    provider: { code: string };
  },
  nextCursor: string | null,
): SyncRunView {
  return {
    id: run.id,
    provider: run.provider.code,
    jobType: run.jobType,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    setsSeen: run.setsSeen,
    cardsSeen: run.cardsSeen,
    pricesWritten: run.pricesWritten,
    skipped: run.skipped,
    errorsCount: run.errorsCount,
    error: run.error,
    nextCursor,
  };
}

function clip(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}
