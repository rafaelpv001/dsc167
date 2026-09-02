import { Injectable } from '@nestjs/common';
import { RaffleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DomainError } from '../../common/filters/domain-error.filter';
import { slugify } from '../../common/utils/slugify.util';
import { generateRaffleNumberValues } from '../../common/utils/generate-raffle-numbers.util';
import { CreateRaffleDto } from './dto/create-raffle.dto';
import { UpdateRaffleDto } from './dto/update-raffle.dto';

const NEXT_STATUS: Record<RaffleStatus, RaffleStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['PAUSED', 'CLOSED'],
  PAUSED: ['ACTIVE', 'CLOSED'],
  CLOSED: [],
};

@Injectable()
export class RafflesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateRaffleDto, adminId: string) {
    const baseSlug = slugify(dto.title);
    if (!baseSlug) {
      throw new DomainError('INVALID_TITLE', 'Título inválido para gerar identificador da rifa.');
    }
    const slug = await this.uniqueSlug(baseSlug);
    const numberValues = generateRaffleNumberValues(dto.totalNumbers, dto.startNumber ?? 0);

    const raffle = await this.prisma.$transaction(async (tx) => {
      const created = await tx.raffle.create({
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          coverImageUrl: dto.coverImageUrl,
          totalNumbers: dto.totalNumbers,
          startNumber: dto.startNumber ?? 0,
          unitPriceCents: dto.unitPriceCents,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          reservationMinutes: dto.reservationMinutes ?? 30,
          status: RaffleStatus.DRAFT,
        },
      });

      await tx.raffleNumber.createMany({
        data: numberValues.map((number) => ({ raffleId: created.id, number })),
      });

      return created;
    });

    await this.auditService.log({
      adminUserId: adminId,
      action: 'raffle.created',
      entity: 'Raffle',
      entityId: raffle.id,
      metadata: { title: raffle.title, totalNumbers: raffle.totalNumbers },
    });

    return raffle;
  }

  async findAllAdmin() {
    return this.prisma.raffle.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findByIdAdmin(id: string) {
    const raffle = await this.prisma.raffle.findUnique({ where: { id } });
    if (!raffle) throw new DomainError('RAFFLE_NOT_FOUND', 'Rifa não encontrada.', 404);
    return raffle;
  }

  async findAllPublicActive() {
    return this.prisma.raffle.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublicBySlug(slug: string) {
    const raffle = await this.prisma.raffle.findUnique({ where: { slug } });
    if (!raffle || raffle.status === RaffleStatus.DRAFT) {
      throw new DomainError('RAFFLE_NOT_FOUND', 'Rifa não encontrada.', 404);
    }

    const [available, reserved, paid] = await Promise.all([
      this.prisma.raffleNumber.count({ where: { raffleId: raffle.id, status: 'AVAILABLE' } }),
      this.prisma.raffleNumber.count({ where: { raffleId: raffle.id, status: 'RESERVED' } }),
      this.prisma.raffleNumber.count({ where: { raffleId: raffle.id, status: 'PAID' } }),
    ]);

    return {
      ...raffle,
      stats: {
        total: raffle.totalNumbers,
        available,
        reserved,
        paid,
        soldPercentage:
          raffle.totalNumbers > 0 ? Math.round((paid / raffle.totalNumbers) * 100) : 0,
      },
    };
  }

  async update(id: string, dto: UpdateRaffleDto, adminId: string) {
    await this.findByIdAdmin(id);
    const raffle = await this.prisma.raffle.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        unitPriceCents: dto.unitPriceCents,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        reservationMinutes: dto.reservationMinutes,
      },
    });

    await this.auditService.log({
      adminUserId: adminId,
      action: 'raffle.updated',
      entity: 'Raffle',
      entityId: id,
    });

    return raffle;
  }

  async changeStatus(id: string, target: RaffleStatus, adminId: string) {
    const raffle = await this.findByIdAdmin(id);
    const allowed = NEXT_STATUS[raffle.status];
    if (!allowed.includes(target)) {
      throw new DomainError(
        'INVALID_STATUS_TRANSITION',
        `Não é possível mover a rifa de ${raffle.status} para ${target}.`,
      );
    }

    const updated = await this.prisma.raffle.update({ where: { id }, data: { status: target } });

    await this.auditService.log({
      adminUserId: adminId,
      action: target === RaffleStatus.CLOSED ? 'raffle.closed' : `raffle.status_changed`,
      entity: 'Raffle',
      entityId: id,
      metadata: { from: raffle.status, to: target },
    });

    return updated;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let suffix = 1;
    // Small, bounded loop: collisions on a fresh slug are rare in practice.
    while (await this.prisma.raffle.findUnique({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
}
