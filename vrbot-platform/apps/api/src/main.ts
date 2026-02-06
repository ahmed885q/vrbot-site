import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './modules/app/app.module';
import { ConfigService } from '@nestjs/config';

function parseOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  const config = app.get(ConfigService);
  const basePath = config.get<string>('API_BASE_PATH') ?? '/api';
  const port = Number(config.get<string>('API_PORT') ?? 3000);

  // Global prefix (/api)
  app.setGlobalPrefix(basePath.replace(/^\//, ''));

  // Versioning (future-proof)
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS (for Stage 2 dashboard)
  const origins = parseOrigins(config.get<string>('CORS_ORIGINS'));
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origins.length === 0) return cb(null, true);
      return origins.includes(origin) ? cb(null, true) : cb(new Error('CORS blocked'), false);
    },
    credentials: true,
  });

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('VRBOT API')
    .setDescription('Control server: auth, users, roles, plans, subscriptions, audit logs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${basePath}/docs`, app, doc);

  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`VRBOT API up on port ${port} (base: ${basePath})`);
}
bootstrap();
