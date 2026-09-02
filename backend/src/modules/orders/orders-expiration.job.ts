import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class OrdersExpirationJob {
  private readonly logger = new Logger(OrdersExpirationJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireOverdueOrders() {
    const expired = await this.prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', expiresAt: { lt: new Date() } },
      select: { id: true },
    });

    for (const { id } of expired) {
      await this.expireOne(id);
    }
  }

  /**
   * Expira um pedido individual dentro de uma transação, com guarda condicional
   * (`status: PENDING_PAYMENT`) em cada update. Isso torna a operação segura mesmo
   * se um webhook de pagamento chegar concorrentemente: se o pagamento já tiver
   * confirmado o pedido (status virou PAID) entre a leitura e esta transação, o
   * updateMany abaixo simplesmente não afeta nenhuma linha — PAID nunca vira EXPIRED.
   */
  async expireOne(orderId: string): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const orderUpdate = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING_PAYMENT' },
        data: { status: 'EXPIRED' },
      });

      if (orderUpdate.count === 0) {
        return null;
      }

      await tx.payment.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { raffleId: true },
      });

      await tx.raffleNumber.updateMany({
        where: { orderId, status: 'RESERVED' },
        data: { status: 'AVAILABLE', orderId: null },
      });

      return { orderId, raffleId: order.raffleId };
    });

    if (result) {
      this.logger.log(`Pedido ${result.orderId} expirado; números liberados.`);
      await this.auditService.log({
        action: 'order.expired',
        entity: 'Order',
        entityId: result.orderId,
      });
      this.realtimeGateway.emit({ raffleId: result.raffleId, type: 'NUMBERS_CHANGED' });
    }
  }
}
