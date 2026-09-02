import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { AuditService } from '../audit/audit.service';
import { PaymentsService } from '../payments/payments.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { DomainError } from '../../common/filters/domain-error.filter';

describe('OrdersService.create — concorrência de reserva', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: OrdersService;
  const auditService = { log: jest.fn() } as unknown as AuditService;
  const customersService = { findOrCreate: jest.fn() } as unknown as CustomersService;
  const paymentsService = { createPixForOrder: jest.fn() } as unknown as PaymentsService;
  const realtimeGateway = { emit: jest.fn() } as unknown as RealtimeGateway;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
    service = new OrdersService(
      prisma as unknown as PrismaService,
      customersService,
      auditService,
      paymentsService,
      realtimeGateway,
    );
  });

  it('rejeita a reserva inteira quando nem todos os números estão mais AVAILABLE', async () => {
    prisma.raffle.findUnique.mockResolvedValue({
      id: 'raffle-1',
      status: 'ACTIVE',
      reservationMinutes: 30,
      unitPriceCents: 1000,
    } as any);

    // Simula que apenas 1 dos 2 números pedidos ainda estava AVAILABLE quando o
    // UPDATE condicional rodou — a outra reserva venceu a corrida primeiro.
    prisma.raffleNumber.updateMany.mockResolvedValue({ count: 1 } as any);

    await expect(
      service.create('raffle-1', {
        numbers: ['010', '020'],
        customerName: 'Ana',
        customerPhone: '11999999999',
      }),
    ).rejects.toThrow(DomainError);

    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(paymentsService.createPixForOrder).not.toHaveBeenCalled();
  });

  it('rejeita reserva em rifa que não está ACTIVE', async () => {
    prisma.raffle.findUnique.mockResolvedValue({ id: 'raffle-1', status: 'CLOSED' } as any);

    await expect(
      service.create('raffle-1', {
        numbers: ['010'],
        customerName: 'Ana',
        customerPhone: '11999999999',
      }),
    ).rejects.toMatchObject({ code: 'RAFFLE_NOT_ACTIVE' });
  });
});
