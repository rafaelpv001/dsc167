import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type {
  PaymentProvider,
  WebhookValidationResult,
} from './providers/payment-provider.interface';

describe('PaymentsService.processWebhook — idempotência e validação', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: PaymentsService;
  let provider: jest.Mocked<PaymentProvider>;
  const auditService = { log: jest.fn() } as unknown as AuditService;
  const realtimeGateway = { emit: jest.fn() } as unknown as RealtimeGateway;

  const validPayload: WebhookValidationResult = {
    valid: true,
    providerEventId: 'evt-1',
    eventType: 'charge.paid',
    providerChargeId: 'charge-1',
    status: 'PAID',
    amountCents: 1000,
    paidAt: new Date(),
  };

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
    provider = {
      validateWebhook: jest.fn(),
      createPixPayment: jest.fn(),
      getPaymentStatus: jest.fn(),
      cancelPayment: jest.fn(),
      name: 'PAGBANK',
    } as any;
    const config = { get: jest.fn().mockReturnValue(false) } as any;
    service = new PaymentsService(
      prisma as unknown as PrismaService,
      provider,
      auditService,
      realtimeGateway,
      config,
    );
  });

  it('rejeita webhook com assinatura/token inválido', async () => {
    provider.validateWebhook.mockReturnValue({ ...validPayload, valid: false });
    await expect(service.processWebhook('{}', {})).rejects.toMatchObject({
      code: 'INVALID_WEBHOOK',
    });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('ignora e não reprocessa um evento já recebido (mesmo providerEventId)', async () => {
    provider.validateWebhook.mockReturnValue(validPayload);
    prisma.paymentWebhookEvent.findUnique.mockResolvedValue({ id: 'existing-event' } as any);

    const result = await service.processWebhook('{}', {});

    expect(result).toEqual({ success: true, duplicate: true });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('não confirma automaticamente quando o valor recebido diverge do esperado', async () => {
    provider.validateWebhook.mockReturnValue({ ...validPayload, amountCents: 999 });
    prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      amountCents: 1000,
      status: 'PENDING',
    } as any);

    const result = await service.processWebhook('{}', {});

    expect(result).toEqual({ success: true, mismatch: true });
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('confirma o pagamento e nunca reverte um Payment já PAID para outro status', async () => {
    provider.validateWebhook.mockReturnValue(validPayload);
    prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      amountCents: 1000,
      status: 'PENDING',
    } as any);
    prisma.payment.findUnique
      .mockResolvedValueOnce({ id: 'payment-1', status: 'PENDING', orderId: 'order-1' } as any)
      .mockResolvedValueOnce({ order: { raffleId: 'raffle-1' } } as any);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 } as any);
    prisma.order.updateMany.mockResolvedValue({ count: 1 } as any);

    await service.processWebhook('{}', {});

    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }),
    );
  });
});
