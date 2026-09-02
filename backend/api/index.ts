import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/bootstrap';

/**
 * Ponto de entrada serverless para o Vercel. Diferente de main.ts (que faz
 * app.listen em um processo persistente), aqui a aplicação Nest é
 * inicializada uma única vez por instância "quente" da função (cache no
 * escopo do módulo) e reaproveitada entre invocações, expondo diretamente o
 * handler Express — é isso que o runtime Node do Vercel espera de
 * `export default`.
 */
const expressApp = express();
let nestAppPromise: Promise<INestApplication> | null = null;

async function bootstrap(): Promise<express.Express> {
  if (!nestAppPromise) {
    nestAppPromise = createApp(new ExpressAdapter(expressApp)).then(async (app) => {
      await app.init();
      return app;
    });
  }
  await nestAppPromise;
  return expressApp;
}

export default async function handler(req: express.Request, res: express.Response) {
  const server = await bootstrap();
  server(req, res);
}
