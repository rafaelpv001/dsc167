import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from './payments.service';

/**
 * Rede de segurança para casos em que o webhook não chegou. O webhook continua
 * sendo o mecanismo principal de confirmação; este job apenas consulta pagamentos
 * pendentes ainda não expirados, sem polling agressivo (a cada 5 minutos).
 */
@Injectable()
export class PaymentsReconciliationJob {
  private readonly logger = new Logger(PaymentsReconciliationJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcilePendingPayments() {
    const pending = await this.prisma.payment.findMany({
      where: { status: 'PENDING', expiresAt: { gt: new Date() }, providerChargeId: { not: null } },
      select: { id: true },
      take: 100,
    });

    for (const { id } of pending) {
      try {
        await this.paymentsService.syncPaymentStatus(id);
      } catch (error) {
        this.logger.warn(`Falha ao reconciliar pagamento ${id}: ${(error as Error).message}`);
      }
    }
  }
}
