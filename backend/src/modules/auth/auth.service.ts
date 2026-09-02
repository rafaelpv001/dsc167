import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedAdmin } from '../../common/decorators/current-admin.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  /** Usado pela LocalStrategy. Nunca revela se o e-mail existe (evita user enumeration). */
  async validateAdmin(email: string, password: string): Promise<AuthenticatedAdmin> {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });

    if (!admin || !admin.active) {
      await this.auditService.log({
        action: 'auth.login_failed',
        entity: 'AdminUser',
        metadata: { email },
      });
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordValid = await argon2.verify(admin.passwordHash, password).catch(() => false);
    if (!passwordValid) {
      await this.auditService.log({
        adminUserId: admin.id,
        action: 'auth.login_failed',
        entity: 'AdminUser',
        entityId: admin.id,
      });
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    await this.auditService.log({
      adminUserId: admin.id,
      action: 'auth.login_success',
      entity: 'AdminUser',
      entityId: admin.id,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safeAdmin } = admin;
    return safeAdmin;
  }

  signToken(admin: AuthenticatedAdmin): string {
    return this.jwtService.sign({ sub: admin.id, email: admin.email });
  }

  async logout(adminId: string): Promise<void> {
    await this.auditService.log({
      adminUserId: adminId,
      action: 'auth.logout',
      entity: 'AdminUser',
      entityId: adminId,
    });
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }
}
