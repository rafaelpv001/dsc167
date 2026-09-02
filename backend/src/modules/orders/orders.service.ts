import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { OrderStatus, Prisma, RaffleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CustomersService } from '../customers/customers.service';
import { DomainError } from '../../common/filters/domain-error.filter';
import { generateOrderCode } from '../../common/utils/order-code.util';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentsService } from '../payments/payments.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

const CODE_GENERATION_ATTEMPTS = 5;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => PaymentsService)) private readonly paymentsService: PaymentsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(raffleId: string, dto: CreateOrderDto) {
    const raffle = await this.prisma.raffle.findUnique({ where: { id: raffleId } });
    if (!raffle) throw new DomainError('RAFFLE_NOT_FOUND', 'Rifa não encontrada.', 404);
    if (raffle.status !== RaffleStatus.ACTIVE) {
      throw new DomainError('RAFFLE_NOT_ACTIVE', 'Esta rifa não está aceitando novas reservas.');
    }

    const numbers = [...new Set(dto.numbers)];
    const normalizedPhone = dto.customerPhone.replace(/\D/g, '');

    const order = await this.prisma.$transaction(async (tx) => {
      // Conditional update: only rows still AVAILABLE flip to RESERVED. Under
      // Postgres READ COMMITTED this is race-safe — a concurrent transaction
      // updating the same row blocks until commit, then re-evaluates the WHERE
      // clause and finds status already changed, so it cannot double-reserve.
      const reserved = await tx.raffleNumber.updateMany({
        where: { raffleId, number: { in: numbers }, status: 'AVAILABLE' },
        data: { status: 'RESERVED' },
      });

      if (reserved.count !== numbers.length) {
        throw new DomainError(
          'NUMBER_UNAVAILABLE',
          'Um ou mais números selecionados não estão mais disponíveis. Escolha novamente.',
        );
      }

      const customer = await this.customersService.findOrCreate(tx, {
        name: dto.customerName,
        phone: normalizedPhone,
      });

      const expiresAt = new Date(Date.now() + raffle.reservationMinutes * 60_000);
      const totalPriceCents = raffle.unitPriceCents * numbers.length;

      const createdOrder = await this.createOrderWithUniqueCode(tx, {
        raffleId,
        customerId: customer.id,
        quantity: numbers.length,
        unitPriceCents: raffle.unitPriceCents,
        totalPriceCents,
        expiresAt,
      });

      await tx.raffleNumber.updateMany({
        where: { raffleId, number: { in: numbers } },
        data: { orderId: createdOrder.id },
      });

      return createdOrder;
    });

    await this.auditService.log({
      action: 'order.created',
      entity: 'Order',
      entityId: order.id,
      metadata: { raffleId, quantity: numbers.length, totalPriceCents: order.totalPriceCents },
    });

    this.realtimeGateway.emit({ raffleId, type: 'NUMBERS_CHANGED' });

    // Reserva já commitada; se a criação da cobrança PIX falhar, o próprio
    // PaymentsService cancela o pedido e libera os números (nunca ficam presos).
    await this.paymentsService.createPixForOrder(order.id);

    return this.findByPublicToken(order.publicToken);
  }

  private async createOrderWithUniqueCode(
    tx: Prisma.TransactionClient,
    data: {
      raffleId: string;
      customerId: string;
      quantity: number;
      unitPriceCents: number;
      totalPriceCents: number;
      expiresAt: Date;
    },
  ) {
    for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const suffix = String(randomInt(0, 100_000)).padStart(5, '0');
      const code = generateOrderCode(new Date(), suffix);
      try {
        return await tx.order.create({
          data: { ...data, code, status: OrderStatus.PENDING_PAYMENT },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          this.logger.warn(`Colisão de código de pedido (${code}), tentando novamente.`);
          continue;
        }
        throw error;
      }
    }
    throw new DomainError(
      'ORDER_CODE_GENERATION_FAILED',
      'Não foi possível gerar o código do pedido.',
      500,
    );
  }

  async findByPublicToken(publicToken: string) {
    const order = await this.prisma.order.findUnique({
      where: { publicToken },
      include: {
        raffle: { select: { title: true, slug: true } },
        numbers: { select: { number: true }, orderBy: { number: 'asc' } },
        payment: true,
      },
    });
    if (!order) throw new DomainError('ORDER_NOT_FOUND', 'Pedido não encontrado.', 404);
    return order;
  }

  async findAllAdmin(filters: { status?: OrderStatus; search?: string }) {
    return this.prisma.order.findMany({
      where: {
        status: filters.status,
        ...(filters.search
          ? {
              OR: [
                { code: { contains: filters.search, mode: 'insensitive' } },
                { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
                { customer: { phone: { contains: filters.search } } },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        raffle: { select: { title: true } },
        payment: true,
        numbers: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findByIdAdmin(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        raffle: true,
        payment: { include: { webhookEvents: true } },
        numbers: true,
      },
    });
    if (!order) throw new DomainError('ORDER_NOT_FOUND', 'Pedido não encontrado.', 404);
    return order;
  }

  async cancel(id: string, adminId: string, reason?: string) {
    const order = await this.findByIdAdmin(id);
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new DomainError(
        'INVALID_ORDER_STATUS',
        'Somente pedidos aguardando pagamento podem ser cancelados.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
      });
      await tx.raffleNumber.updateMany({
        where: { orderId: id, status: 'RESERVED' },
        data: { status: 'AVAILABLE', orderId: null },
      });
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
      }
    });

    await this.auditService.log({
      adminUserId: adminId,
      action: 'order.cancelled',
      entity: 'Order',
      entityId: id,
      metadata: { reason },
    });
  }

  async reject(id: string, adminId: string, reason?: string) {
    const order = await this.findByIdAdmin(id);
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new DomainError(
        'INVALID_ORDER_STATUS',
        'Somente pedidos aguardando pagamento podem ser rejeitados.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: OrderStatus.REJECTED, rejectedAt: new Date() },
      });
      await tx.raffleNumber.updateMany({
        where: { orderId: id, status: 'RESERVED' },
        data: { status: 'AVAILABLE', orderId: null },
      });
    });

    await this.auditService.log({
      adminUserId: adminId,
      action: 'order.rejected',
      entity: 'Order',
      entityId: id,
      metadata: { reason },
    });
  }
}
