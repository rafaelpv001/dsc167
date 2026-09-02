import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  /** Reaproveita um Customer existente pelo telefone (dentro da mesma tx) ou cria um novo. */
  async findOrCreate(tx: Prisma.TransactionClient, data: { name: string; phone: string }) {
    const existing = await tx.customer.findFirst({ where: { phone: data.phone } });
    if (existing) {
      if (existing.name !== data.name) {
        return tx.customer.update({ where: { id: existing.id }, data: { name: data.name } });
      }
      return existing;
    }
    return tx.customer.create({ data });
  }
}
