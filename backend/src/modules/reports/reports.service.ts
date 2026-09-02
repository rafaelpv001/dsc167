import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainError } from '../../common/filters/domain-error.filter';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [
      activeRaffles,
      closedRaffles,
      numberStats,
      revenueConfirmed,
      pendingOrders,
      expiredOrders,
      participants,
    ] = await Promise.all([
      this.prisma.raffle.count({ where: { status: 'ACTIVE' } }),
      this.prisma.raffle.count({ where: { status: 'CLOSED' } }),
      this.prisma.raffleNumber.groupBy({ by: ['status'], _count: true }),
      this.prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { totalPriceCents: true } }),
      this.prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
      this.prisma.order.count({ where: { status: 'EXPIRED' } }),
      this.prisma.customer.count(),
    ]);

    const totals = { AVAILABLE: 0, RESERVED: 0, PAID: 0 } as Record<string, number>;
    for (const row of numberStats) totals[row.status] = row._count;

    const potentialRevenue = await this.prisma.raffle.aggregate({ _sum: { unitPriceCents: true } });
    const totalNumbers = totals.AVAILABLE + totals.RESERVED + totals.PAID;

    return {
      activeRaffles,
      closedRaffles,
      totalNumbers,
      availableNumbers: totals.AVAILABLE,
      reservedNumbers: totals.RESERVED,
      paidNumbers: totals.PAID,
      soldPercentage: totalNumbers > 0 ? Math.round((totals.PAID / totalNumbers) * 100) : 0,
      revenueConfirmedCents: revenueConfirmed._sum.totalPriceCents ?? 0,
      pendingOrders,
      expiredOrders,
      participants,
      potentialRevenueCents: potentialRevenue._sum.unitPriceCents ?? 0,
    };
  }

  async raffleReport(raffleId: string) {
    const raffle = await this.prisma.raffle.findUnique({ where: { id: raffleId } });
    if (!raffle) throw new DomainError('RAFFLE_NOT_FOUND', 'Rifa não encontrada.', 404);

    const [numberStats, orderStats, paidOrders, participantCount] = await Promise.all([
      this.prisma.raffleNumber.groupBy({ by: ['status'], where: { raffleId }, _count: true }),
      this.prisma.order.groupBy({ by: ['status'], where: { raffleId }, _count: true }),
      this.prisma.order.aggregate({
        where: { raffleId, status: 'PAID' },
        _sum: { totalPriceCents: true },
        _count: true,
      }),
      this.prisma.order.findMany({
        where: { raffleId, status: 'PAID' },
        distinct: ['customerId'],
        select: { customerId: true },
      }),
    ]);

    const numbers = { AVAILABLE: 0, RESERVED: 0, PAID: 0 } as Record<string, number>;
    for (const row of numberStats) numbers[row.status] = row._count;

    const orders = { PENDING_PAYMENT: 0, PAID: 0, REJECTED: 0, EXPIRED: 0, CANCELLED: 0 } as Record<
      string,
      number
    >;
    for (const row of orderStats) orders[row.status] = row._count;

    const revenueConfirmedCents = paidOrders._sum.totalPriceCents ?? 0;
    const paidOrderCount = paidOrders._count;

    return {
      raffle: {
        id: raffle.id,
        title: raffle.title,
        status: raffle.status,
        unitPriceCents: raffle.unitPriceCents,
      },
      totalNumbers: raffle.totalNumbers,
      numbers,
      soldPercentage:
        raffle.totalNumbers > 0 ? Math.round((numbers.PAID / raffle.totalNumbers) * 100) : 0,
      potentialRevenueCents: raffle.totalNumbers * raffle.unitPriceCents,
      revenueConfirmedCents,
      averageTicketCents:
        paidOrderCount > 0 ? Math.round(revenueConfirmedCents / paidOrderCount) : 0,
      participants: participantCount.length,
      orders,
    };
  }

  async exportOrdersCsv(raffleId: string): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: { raffleId },
      include: { customer: true, numbers: { select: { number: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const header =
      'code,customer_name,customer_phone,numbers,quantity,total_price_cents,status,created_at,paid_at';
    const rows = orders.map((o) =>
      [
        o.code,
        csvEscape(o.customer.name),
        o.customer.phone,
        csvEscape(o.numbers.map((n) => n.number).join(' ')),
        o.quantity,
        o.totalPriceCents,
        o.status,
        o.createdAt.toISOString(),
        o.paidAt?.toISOString() ?? '',
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
