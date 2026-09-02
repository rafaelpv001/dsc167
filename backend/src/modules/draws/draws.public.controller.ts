import { Controller, Get, Param } from '@nestjs/common';
import { DrawsService } from './draws.service';

@Controller('api/raffles')
export class DrawsPublicController {
  constructor(private readonly drawsService: DrawsService) {}

  // Retorna apenas dados públicos (número vencedor, data, nome parcial) — ver
  // DrawsService.getStatus/toPublicResult. Nunca telefone/dados financeiros.
  @Get(':id/draw')
  status(@Param('id') raffleId: string) {
    return this.drawsService.getStatus(raffleId);
  }
}
