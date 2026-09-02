import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersExpirationJob } from '../orders/orders-expiration.job';
import { DemoCleanupJob } from '../orders/demo-cleanup.job';
import { PaymentsReconciliationJob } from '../payments/payments-reconciliation.job';

/**
 * Em hospedagem serverless (Vercel), não existe processo persistente para
 * @nestjs/schedule (@Cron) rodar — a função sobe, responde, e pode ser
 * derrubada a qualquer momento. Estes endpoints fazem o mesmo trabalho dos
 * jobs, disparados por Vercel Cron Jobs (ver backend/vercel.json) via HTTP.
 * Protegidos por um segredo compartilhado (CRON_SECRET), não pelo login
 * de admin — quem chama é a infraestrutura do Vercel, não uma pessoa.
 *
 * Em hospedagem tradicional (processo Node sempre no ar), os @Cron
 * continuam funcionando normalmente em paralelo — chamar os dois não causa
 * problema, pois toda a lógica de negócio já é idempotente/condicional.
 */
@Controller('api/internal/cron')
export class InternalCronController {
  constructor(
    private readonly config: ConfigService,
    private readonly ordersExpirationJob: OrdersExpirationJob,
    private readonly demoCleanupJob: DemoCleanupJob,
    private readonly paymentsReconciliationJob: PaymentsReconciliationJob,
  ) {}

  private assertAuthorized(headers: Record<string, string | string[] | undefined>) {
    const secret = this.config.get<string>('cronSecret');
    const provided = String(headers['authorization'] ?? '').replace('Bearer ', '');
    if (!secret || provided !== secret) {
      throw new UnauthorizedException('CRON_SECRET inválido ou não configurado.');
    }
  }

  @Get('expire-orders')
  async expireOrders(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.assertAuthorized(headers);
    await this.ordersExpirationJob.expireOverdueOrders();
    return { success: true };
  }

  @Get('cleanup-demo')
  async cleanupDemo(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.assertAuthorized(headers);
    await this.demoCleanupJob.purgeExpiredDemoData();
    return { success: true };
  }

  @Get('reconcile-payments')
  async reconcilePayments(@Headers() headers: Record<string, string | string[] | undefined>) {
    this.assertAuthorized(headers);
    await this.paymentsReconciliationJob.reconcilePendingPayments();
    return { success: true };
  }
}
