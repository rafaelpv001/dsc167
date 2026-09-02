import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { DrawsService } from './draws.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('DrawsService.execute — regra fundamental do pool', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: DrawsService;
  const auditService = { log: jest.fn() } as unknown as AuditService;
  const realtimeGateway = { emit: jest.fn() } as unknown as RealtimeGateway;

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
    service = new DrawsService(prisma as unknown as PrismaService, auditService, realtimeGateway);
    prisma.raffle.findUnique.mockResolvedValue({ id: 'raffle-1', status: 'CLOSED' } as any);
  });

  it('bloqueia sorteio se a rifa não estiver CLOSED', async () => {
    prisma.raffle.findUnique.mockResolvedValue({ id: 'raffle-1', status: 'ACTIVE' } as any);
    await expect(service.execute('raffle-1', 'admin-1')).rejects.toMatchObject({
      code: 'RAFFLE_NOT_CLOSED',
    });
  });

  it('bloqueia sorteio duplicado (já existe RaffleDraw para a rifa)', async () => {
    prisma.raffleDraw.findUnique.mockResolvedValue({ id: 'draw-1' } as any);
    await expect(service.execute('raffle-1', 'admin-1')).rejects.toMatchObject({
      code: 'RAFFLE_ALREADY_DRAWN',
    });
  });

  it('bloqueia sorteio quando não há nenhum número PAID', async () => {
    prisma.raffleDraw.findUnique.mockResolvedValue(null);
    prisma.raffleNumber.findMany.mockResolvedValue([]);
    await expect(service.execute('raffle-1', 'admin-1')).rejects.toMatchObject({
      code: 'NO_ELIGIBLE_NUMBERS',
    });
  });

  it('o vencedor sorteado é sempre um dos números elegíveis (somente PAID)', async () => {
    const eligible = ['005', '010', '015', '027', '044', '063', '078', '091'].map((number, i) => ({
      id: `num-${i}`,
      number,
      raffleId: 'raffle-1',
      status: 'PAID',
      orderId: `order-${i}`,
      order: { customerId: `customer-${i}` },
    }));

    prisma.raffleDraw.findUnique.mockResolvedValue(null);
    prisma.raffleNumber.findMany.mockResolvedValue(eligible as any);
    prisma.raffleDraw.create.mockImplementation(
      ({ data }: any) => Promise.resolve({ id: 'draw-1', ...data }) as any,
    );
    prisma.raffleDrawEntry.createMany.mockResolvedValue({ count: eligible.length } as any);
    prisma.raffleDraw.findUniqueOrThrow.mockImplementation(
      () =>
        Promise.resolve({
          id: 'draw-1',
          winningNumber: '044',
          eligibleNumbersCount: eligible.length,
          drawMethod: 'CRYPTO_RANDOM',
          algorithm: 'node:crypto.randomInt',
        }) as any,
    );

    const draw = await service.execute('raffle-1', 'admin-1');

    expect(eligible.map((n) => n.number)).toContain(draw.winningNumber);
    expect(prisma.raffleDrawEntry.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining(
          eligible.map((n) => expect.objectContaining({ number: n.number })),
        ),
      }),
    );
  });
});
