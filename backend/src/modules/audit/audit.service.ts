import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogInput {
  adminUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Ponto único de escrita do AuditLog. Nunca deve receber dados sensíveis
 * (senhas, tokens, PII além do estritamente necessário) em `metadata`.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminUserId: input.adminUserId ?? null,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      // Auditoria não deve derrubar o fluxo principal da requisição.
      this.logger.error(`Falha ao registrar AuditLog (${input.action})`, error as Error);
    }
  }
}
