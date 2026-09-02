import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ExpressAdapter } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Configuração compartilhada entre o processo tradicional (main.ts, usado em
 * desenvolvimento e em hospedagem com processo persistente) e o handler
 * serverless do Vercel (api/index.ts). Mantém os dois pontos de entrada
 * sempre com o mesmo comportamento (middlewares, CORS, Swagger).
 */
export async function createApp(adapter?: ExpressAdapter) {
  const app = adapter
    ? await NestFactory.create<NestExpressApplication>(AppModule, adapter, { rawBody: true })
    : await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  const config = app.get(ConfigService);

  // crossOriginResourcePolicy: cross-origin — frontend e backend rodam em
  // origens/portas diferentes e o frontend carrega imagens (capa das rifas)
  // diretamente de /uploads deste servidor (quando o storage é local disco).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  // Em serverless (Vercel) o filesystem é efêmero e read-only fora de /tmp —
  // servir /uploads localmente só faz sentido em desenvolvimento/hospedagem
  // tradicional. Em produção serverless, o UploadsController usa Vercel Blob
  // (ver storage/blob-storage.provider.ts) e retorna URLs públicas do Blob,
  // que não passam por esta rota.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  app.enableCors({
    origin: config.get<string>('appUrl') ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (config.get('nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Rifa Online API')
      .setDescription('API do sistema de rifas online (rifas, pedidos, PIX PagBank, sorteio)')
      .setVersion('1.0')
      .addCookieAuth('admin_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  return app;
}
