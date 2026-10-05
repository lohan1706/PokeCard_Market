import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
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

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('PokéCard Market')
      .setDescription('Infrastructure API. Business routes are not implemented yet.')
      .setVersion('0.1.0')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
}
