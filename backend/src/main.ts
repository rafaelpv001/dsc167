import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createApp } from './bootstrap';

async function bootstrap() {
  const app = await createApp();
  const config = app.get(ConfigService);

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  Logger.log(`Rifa Online API rodando na porta ${port}`, 'Bootstrap');
}

bootstrap();
