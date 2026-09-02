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
    // Se a inicialização falhar (ex.: DATABASE_URL ausente/inválida), não
    // deixa a instância presa numa promise rejeitada para sempre — a próxima
    // invocação tenta inicializar de novo em vez de repetir o mesmo erro.
    nestAppPromise.catch(() => {
      nestAppPromise = null;
    });
  }
  await nestAppPromise;
  return expressApp;
}

export default async function handler(req: express.Request, res: express.Response) {
  try {
    const server = await bootstrap();
    server(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Falha ao inicializar a aplicação Nest (serverless):', error);
    res.status(500).json({
      success: false,
      code: 'BOOTSTRAP_FAILED',
      message: (error as Error).message,
    });
  }
}
