import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DomainError } from '../../common/filters/domain-error.filter';
import { CreateAdminDto } from './dto/create-admin.dto';

const SAFE_SELECT = { id: true, name: true, email: true, active: true, createdAt: true } as const;

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.adminUser.findMany({ select: SAFE_SELECT, orderBy: { createdAt: 'asc' } });
  }

  async create(dto: CreateAdminDto, createdByAdminId: string) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      throw new DomainError(
        'ADMIN_EMAIL_TAKEN',
        'Já existe um administrador com este e-mail.',
        409,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const admin = await this.prisma.adminUser.create({
      data: { name: dto.name, email, passwordHash, active: true },
      select: SAFE_SELECT,
    });

    await this.auditService.log({
      adminUserId: createdByAdminId,
      action: 'admin.created',
      entity: 'AdminUser',
      entityId: admin.id,
      metadata: { email: admin.email },
    });

    return admin;
  }

  async setActive(id: string, active: boolean, changedByAdminId: string) {
    if (id === changedByAdminId && !active) {
      throw new DomainError('CANNOT_DEACTIVATE_SELF', 'Você não pode desativar a própria conta.');
    }

    const admin = await this.prisma.adminUser.update({
      where: { id },
      data: { active },
      select: SAFE_SELECT,
    });

    await this.auditService.log({
      adminUserId: changedByAdminId,
      action: active ? 'admin.activated' : 'admin.deactivated',
      entity: 'AdminUser',
      entityId: id,
    });

    return admin;
  }
}
