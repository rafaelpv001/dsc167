import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminUser } from '@prisma/client';

export type AuthenticatedAdmin = Omit<AdminUser, 'passwordHash'>;

/**
 * Extrai o AdminUser autenticado (sem passwordHash) anexado à request pelo
 * JwtStrategy. Só deve ser usado em rotas protegidas por JwtAuthGuard.
 */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAdmin => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedAdmin;
  },
);
