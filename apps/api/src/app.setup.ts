import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './auth/http-exception.filter';
import { SESSION_COOKIE_NAME } from './auth/auth.constants';
import { parseEnv } from './config/env.schema';

export function configureApp(app: INestApplication): void {
  const env = parseEnv(process.env);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('PokéCard Market')
      .setDescription('API PokéCard Market.')
      .setVersion('0.1.0')
      .addCookieAuth(SESSION_COOKIE_NAME)
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
}
