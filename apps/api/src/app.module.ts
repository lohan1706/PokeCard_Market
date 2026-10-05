import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { parseEnv } from './config/env.schema';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      validate: (env) => parseEnv(env),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CatalogModule,
    DashboardModule,
    AdminModule,
  ],
})
export class AppModule {}
