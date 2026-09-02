import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DomainError } from '../../common/filters/domain-error.filter';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type WebhookValidationResult,
} from './providers/payment-provider.interface';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly config: ConfigService,
  ) {}

  /** Cria a cobrança PIX para um pedido recém-reservado. Se falhar, cancela o pedido e libera os números. */
  async createPixForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, raffle: true, payment: true },
    });
    if (!order) throw new DomainError('ORDER_NOT_FOUND', 'Pedido não encontrado.', 404);
    if (order.payment) return order.payment; // já criado — evita cobrança duplicada

    try {
      const result = await this.provider.createPixPayment({
        orderId: order.id,
        referenceId: order.code,
        amountCents: order.totalPriceCents,
        description: `Rifa ${order.raffle.title} - pedido ${order.code}`,
        expiresAt: order.expiresAt,
        customer: { name: order.customer.name, phone: order.customer.phone },
      });

      const payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          provider: this.provider.name === 'DEMO' ? 'DEMO' : 'PAGBANK',
          providerOrderId: result.providerOrderId,
          providerChargeId: result.providerChargeId,
          amountCents: order.totalPriceCents,
          status: PaymentStatus.PENDING,
          pixQrCode: result.pixQrCode,
          pixQrCodeImage: result.pixQrCodeImage,
          pixCopyPaste: result.pixCopyPaste,
          expiresAt: order.expiresAt,
        },
      });

      await this.auditService.log({
        action: 'payment.created',
        entity: 'Payment',
        entityId: payment.id,
        metadata: { orderId: order.id, providerChargeId: result.providerChargeId },
      });

      if (this.config.get<boolean>('demo.enabled')) {
        this.scheduleDemoAutoConfirmation(payment.id);
      }

      return payment;
    } catch (error) {
      this.logger.error(`Falha ao criar cobrança PIX para pedido ${order.code}`, error as Error);
      await this.auditService.log({
        action: 'payment.creation_failed',
        entity: 'Order',
        entityId: order.id,
        metadata: { error: (error as Error).message },
      });

      // Sem cobrança criada: números presos indefinidamente é inaceitável — libera e cancela.
      await this.prisma.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING_PAYMENT' },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        await tx.raffleNumber.updateMany({
          where: { orderId: order.id, status: 'RESERVED' },
          data: { status: 'AVAILABLE', orderId: null },
        });
      });

      throw new DomainError(
        'PAYMENT_CREATION_FAILED',
        'Não foi possível gerar o pagamento PIX. A reserva foi cancelada, tente novamente.',
        502,
      );
    }
  }

  /**
   * Simula o cliente pagando: agenda a confirmação do pagamento demo após um
   * pequeno atraso (para a UI de "aguardando pagamento" ser visível), sem
   * tocar em nenhuma API externa. Só chamado quando demo.enabled=true.
   */
  private scheduleDemoAutoConfirmation(paymentId: string): void {
    const delayMs = this.config.get<number>('demo.autoConfirmDelayMs') ?? 4000;
    setTimeout(() => {
      this.confirmPayment(paymentId, {
        method: 'DEMO_AUTO',
        note: 'Pagamento simulado (ambiente de teste).',
      }).catch((error) =>
        this.logger.error(`Falha ao auto-confirmar pagamento demo ${paymentId}`, error as Error),
      );
    }, delayMs);
  }

  /** Ponto único de confirmação de pagamento — usado pelo webhook, reconciliação, confirmação manual e demo. */
  async confirmPayment(
    paymentId: string,
    context: {
      method: 'PAGBANK_WEBHOOK' | 'PAGBANK_SYNC' | 'MANUAL' | 'DEMO_AUTO';
      adminId?: string;
      note?: string;
    },
  ): Promise<'CONFIRMED' | 'ALREADY_CONFIRMED' | 'ORDER_NOT_PENDING'> {
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      });
      if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'Pagamento não encontrado.', 404);

      if (payment.status === 'PAID') {
        return 'ALREADY_CONFIRMED' as const;
      }

      // Guarda condicional: só confirma se ainda PENDING (nunca PAID -> ... e nunca
      // reabre um pagamento já EXPIRED/CANCELLED/FAILED silenciosamente).
      const paymentUpdate = await tx.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: { status: 'PAID', paidAt: new Date() },
      });
      if (paymentUpdate.count === 0) {
        return 'ORDER_NOT_PENDING' as const;
      }

      const orderUpdate = await tx.order.updateMany({
        where: { id: payment.orderId, status: 'PENDING_PAYMENT' },
        data: { status: 'PAID', paidAt: new Date() },
      });
      if (orderUpdate.count === 0) {
        // Payment estava PENDING mas Order não — estado inconsistente; não avança números.
        return 'ORDER_NOT_PENDING' as const;
      }

      await tx.raffleNumber.updateMany({
        where: { orderId: payment.orderId, status: 'RESERVED' },
        data: { status: 'PAID' },
      });

      return 'CONFIRMED' as const;
    });

    if (result === 'CONFIRMED') {
      await this.auditService.log({
        adminUserId: context.adminId,
        action: 'payment.paid',
        entity: 'Payment',
        entityId: paymentId,
        metadata: { method: context.method, note: context.note },
      });

      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        select: { order: { select: { raffleId: true } } },
      });
      if (payment) {
        this.realtimeGateway.emit({ raffleId: payment.order.raffleId, type: 'PAYMENT_CONFIRMED' });
      }
    }

    return result;
  }

  async confirmManually(orderId: string, adminId: string, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order?.payment)
      throw new DomainError('PAYMENT_NOT_FOUND', 'Pedido não possui pagamento associado.', 404);
    return this.confirmPayment(order.payment.id, { method: 'MANUAL', adminId, note });
  }

  async getPaymentIdForOrder(orderId: string): Promise<string | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { payment: { select: { id: true } } },
    });
    return order?.payment?.id ?? null;
  }

  async syncPaymentStatus(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'Pagamento não encontrado.', 404);
    if (!payment.providerChargeId || payment.status !== 'PENDING') return payment;

    const remote = await this.provider.getPaymentStatus(payment.providerChargeId);

    if (remote.status === 'PAID') {
      if (remote.amountCents !== payment.amountCents) {
        await this.auditService.log({
          action: 'payment.amount_mismatch',
          entity: 'Payment',
          entityId: payment.id,
          metadata: { expected: payment.amountCents, received: remote.amountCents },
        });
        return payment; // não confirma automaticamente — precisa de análise administrativa
      }
      await this.confirmPayment(payment.id, { method: 'PAGBANK_SYNC' });
    }

    return this.prisma.payment.findUnique({ where: { id: paymentId } });
  }

  /** Processa webhook do PagBank com validação, idempotência e checagem de valor. */
  async processWebhook(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const validation = this.provider.validateWebhook(rawBody, headers);
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');

    if (!validation.valid) {
      await this.recordWebhookEvent(
        validation,
        payloadHash,
        'IGNORED',
        'Assinatura/token inválido.',
      );
      throw new DomainError('INVALID_WEBHOOK', 'Webhook inválido.', 401);
    }

    // Idempotência: (provider, providerEventId) é @@unique — uma segunda entrega
    // do mesmo evento colide e é tratada como duplicata, não reprocessada.
    const existing = validation.providerEventId
      ? await this.prisma.paymentWebhookEvent.findUnique({
          where: {
            provider_providerEventId: {
              provider: 'PAGBANK',
              providerEventId: validation.providerEventId,
            },
          },
        })
      : null;

    if (existing) {
      this.logger.log(`Webhook duplicado ignorado (eventId=${validation.providerEventId}).`);
      return { success: true, duplicate: true };
    }

    const payment = validation.providerChargeId
      ? await this.prisma.payment.findFirst({
          where: { providerChargeId: validation.providerChargeId },
        })
      : null;

    if (!payment) {
      await this.recordWebhookEvent(
        validation,
        payloadHash,
        'IGNORED',
        'Payment não encontrado para a cobrança.',
      );
      return { success: true, ignored: true };
    }

    if (validation.amountCents !== null && validation.amountCents !== payment.amountCents) {
      await this.recordWebhookEvent(
        validation,
        payloadHash,
        'FAILED',
        'Valor divergente do esperado.',
        payment.id,
      );
      await this.auditService.log({
        action: 'payment.amount_mismatch',
        entity: 'Payment',
        entityId: payment.id,
        metadata: { expected: payment.amountCents, received: validation.amountCents },
      });
      return { success: true, mismatch: true };
    }

    if (validation.status === 'PAID') {
      await this.confirmPayment(payment.id, { method: 'PAGBANK_WEBHOOK' });
    }

    await this.recordWebhookEvent(validation, payloadHash, 'PROCESSED', undefined, payment.id);
    return { success: true };
  }

  private async recordWebhookEvent(
    validation: WebhookValidationResult,
    payloadHash: string,
    status: 'PROCESSED' | 'IGNORED' | 'FAILED',
    errorMessage?: string,
    paymentId?: string,
  ) {
    try {
      await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: 'PAGBANK',
          providerEventId: validation.providerEventId,
          eventType: validation.eventType,
          paymentId: paymentId ?? null,
          payloadHash,
          processingStatus: status,
          processedAt: new Date(),
          errorMessage,
        },
      });
    } catch (error) {
      this.logger.error('Falha ao registrar PaymentWebhookEvent', error as Error);
    }
  }
}
