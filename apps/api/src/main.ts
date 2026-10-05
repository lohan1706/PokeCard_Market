import 'reflect-metadata';
import './config/load-dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { parseEnv } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const env = parseEnv(process.env);
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(env.API_PORT, '0.0.0.0');
}

void bootstrap();
