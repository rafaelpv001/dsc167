import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

/**
 * Só ativo com DEMO_MODE=true. Apaga definitivamente (sem manter histórico,
 * para não ocupar espaço em banco) qualquer Order/Payment/Customer/AuditLog
 * gerado no ambiente de demonstração com mais de `demo.retentionMinutes`,
 * devolvendo os números correspondentes para AVAILABLE. A rifa e os
 * RaffleNumber em si nunca são apagados — só os dados "preenchidos" pelo uso.
 */
@Injectable()
export class DemoCleanupJob {
  private readonly logger = new Logger(DemoCleanupJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async purgeExpiredDemoData(): Promise<void> {
    if (!this.config.get<boolean>('demo.enabled')) return;

    const retentionMinutes = this.config.get<number>('demo.retentionMinutes') ?? 60;
    const cutoff = new Date(Date.now() - retentionMinutes * 60_000);

    const staleOrders = await this.prisma.order.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, customerId: true, raffleId: true },
    });

    if (staleOrders.length === 0) return;

    const orderIds = staleOrders.map((o) => o.id);
    const affectedRaffleIds = [...new Set(staleOrders.map((o) => o.raffleId))];

    await this.prisma.$transaction(async (tx) => {
      const payments = await tx.payment.findMany({
        where: { orderId: { in: orderIds } },
        select: { id: true },
      });
      const paymentIds = payments.map((p) => p.id);

      await tx.paymentWebhookEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
      await tx.raffleDrawEntry.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });

      await tx.raffleNumber.updateMany({
        where: { orderId: { in: orderIds } },
        data: { status: 'AVAILABLE', orderId: null },
      });

      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { entity: 'Order', entityId: { in: orderIds } },
            { entity: 'Payment', entityId: { in: paymentIds } },
          ],
        },
      });

      await tx.order.deleteMany({ where: { id: { in: orderIds } } });

      // Remove clientes que ficaram sem nenhum pedido (não há dado do participante para reter).
      const customerIds = [...new Set(staleOrders.map((o) => o.customerId))];
      for (const customerId of customerIds) {
        const remaining = await tx.order.count({ where: { customerId } });
        if (remaining === 0) {
          await tx.customer.delete({ where: { id: customerId } }).catch(() => undefined);
        }
      }
    });

    this.logger.log(
      `[demo] ${orderIds.length} pedido(s) com mais de ${retentionMinutes}min apagados sem histórico.`,
    );
    for (const raffleId of affectedRaffleIds) {
      this.realtimeGateway.emit({ raffleId, type: 'NUMBERS_CHANGED' });
    }
  }
}
