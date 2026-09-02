import { Injectable } from '@nestjs/common';
import { randomInt, createHash } from 'node:crypto';
import { Prisma, RaffleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DomainError } from '../../common/filters/domain-error.filter';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class DrawsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async getStatus(raffleId: string) {
    const raffle = await this.prisma.raffle.findUnique({
      where: { id: raffleId },
      include: { draw: { include: { winningRaffleNumber: true, customer: true, order: true } } },
    });
    if (!raffle) throw new DomainError('RAFFLE_NOT_FOUND', 'Rifa não encontrada.', 404);

    if (raffle.draw) {
      return {
        status: 'DRAWN' as const,
        result: this.toPublicResult(raffle.draw),
      };
    }

    const paidCount = await this.prisma.raffleNumber.count({ where: { raffleId, status: 'PAID' } });
    return {
      status:
        raffle.status === RaffleStatus.CLOSED && paidCount > 0
          ? ('READY' as const)
          : ('NOT_READY' as const),
      eligibleNumbersCount: paidCount,
      raffleStatus: raffle.status,
    };
  }

  /**
   * Executa o sorteio. Regra fundamental: somente RaffleNumber.status === PAID
   * entra no pool — AVAILABLE e RESERVED nunca participam, e números de pedidos
   * EXPIRED/REJECTED/CANCELLED já voltaram a AVAILABLE, então ficam
   * automaticamente excluídos por não estarem mais PAID.
   */
  async execute(raffleId: string, adminId: string) {
    const raffle = await this.prisma.raffle.findUnique({ where: { id: raffleId } });
    if (!raffle) throw new DomainError('RAFFLE_NOT_FOUND', 'Rifa não encontrada.', 404);
    if (raffle.status !== RaffleStatus.CLOSED) {
      throw new DomainError(
        'RAFFLE_NOT_CLOSED',
        'A rifa precisa estar encerrada para ser sorteada.',
      );
    }

    const draw = await this.prisma.$transaction(
      async (tx) => {
        // @@unique(raffleId) em RaffleDraw + esta checagem dentro da transação
        // impedem dois sorteios simultâneos: a segunda tentativa colide (P2002).
        const existing = await tx.raffleDraw.findUnique({ where: { raffleId } });
        if (existing) {
          throw new DomainError('RAFFLE_ALREADY_DRAWN', 'Esta rifa já foi sorteada.', 409);
        }

        const eligible = await tx.raffleNumber.findMany({
          where: { raffleId, status: 'PAID' },
          include: { order: { include: { customer: true } } },
          orderBy: { number: 'asc' },
        });

        if (eligible.length === 0) {
          throw new DomainError(
            'NO_ELIGIBLE_NUMBERS',
            'Esta campanha não possui números com pagamento confirmado e não pode ser sorteada.',
          );
        }

        const verificationHash = createHash('sha256')
          .update(eligible.map((n) => n.number).join(','))
          .digest('hex');

        // node:crypto.randomInt: fonte criptograficamente segura, probabilidade uniforme.
        // Nunca Math.random() e nunca um índice/vencedor vindo do frontend.
        const winnerIndex = randomInt(0, eligible.length);
        const winner = eligible[winnerIndex];

        const eligibleCustomerIds = new Set(eligible.map((n) => n.order!.customerId));

        const created = await tx.raffleDraw.create({
          data: {
            raffleId,
            winningRaffleNumberId: winner.id,
            winningNumber: winner.number,
            customerId: winner.order!.customerId,
            orderId: winner.orderId!,
            eligibleNumbersCount: eligible.length,
            eligibleCustomersCount: eligibleCustomerIds.size,
            drawMethod: 'CRYPTO_RANDOM',
            algorithm: 'node:crypto.randomInt',
            drawnByAdminId: adminId,
            verificationHash,
          },
        });

        await tx.raffleDrawEntry.createMany({
          data: eligible.map((n) => ({
            drawId: created.id,
            raffleNumberId: n.id,
            number: n.number,
            customerId: n.order!.customerId,
            orderId: n.orderId!,
          })),
        });

        return tx.raffleDraw.findUniqueOrThrow({
          where: { id: created.id },
          include: { winningRaffleNumber: true, customer: true, order: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.auditService.log({
      adminUserId: adminId,
      action: 'raffle.draw_executed',
      entity: 'RaffleDraw',
      entityId: draw.id,
      metadata: {
        winningNumber: draw.winningNumber,
        eligibleNumbers: draw.eligibleNumbersCount,
        drawMethod: draw.drawMethod,
        algorithm: draw.algorithm,
      },
    });

    this.realtimeGateway.emit({
      raffleId,
      type: 'DRAW_EXECUTED',
      payload: { winningNumber: draw.winningNumber },
    });

    return draw;
  }

  async getAdminResult(raffleId: string) {
    const draw = await this.prisma.raffleDraw.findUnique({
      where: { raffleId },
      include: {
        winningRaffleNumber: true,
        customer: true,
        order: true,
        raffle: true,
        drawnByAdmin: true,
      },
    });
    if (!draw) throw new DomainError('DRAW_NOT_FOUND', 'Sorteio ainda não realizado.', 404);
    return draw;
  }

  private toPublicResult(draw: {
    winningNumber: string;
    drawnAt: Date;
    customer: { name: string };
  }) {
    const [firstName, ...rest] = draw.customer.name.trim().split(/\s+/);
    const lastInitial = rest.length > 0 ? `${rest[rest.length - 1][0]}.` : '';
    return {
      winningNumber: draw.winningNumber,
      drawnAt: draw.drawnAt,
      winnerDisplayName: [firstName, lastInitial].filter(Boolean).join(' '),
    };
  }
}
