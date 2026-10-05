import 'reflect-metadata';
import './config/load-dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { parseEnv } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const env = parseEnv(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  await prisma.$connect();

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Worker received ${signal}, disconnecting`);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  console.log('Price worker idle. Ingestion is not implemented yet.');
  await new Promise(() => undefined);
}

void bootstrap();
