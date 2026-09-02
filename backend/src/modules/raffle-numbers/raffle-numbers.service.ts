import { Injectable } from '@nestjs/common';
import { RaffleNumberStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainError } from '../../common/filters/domain-error.filter';

export interface ListNumbersQuery {
  status?: RaffleNumberStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

const MAX_PAGE_SIZE = 500;

@Injectable()
export class RaffleNumbersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(raffleId: string, query: ListNumbersQuery) {
    const raffle = await this.prisma.raffle.findUnique({ where: { id: raffleId } });
    if (!raffle) throw new DomainError('RAFFLE_NOT_FOUND', 'Rifa não encontrada.', 404);

    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(query.pageSize ?? 200, MAX_PAGE_SIZE);

    const where = {
      raffleId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { number: { contains: query.search } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.raffleNumber.findMany({
        where,
        orderBy: { number: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { number: true, status: true },
      }),
      this.prisma.raffleNumber.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
