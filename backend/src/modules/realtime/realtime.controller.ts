import { Controller, Param, Sse } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Controller('api/raffles')
export class RealtimeController {
  constructor(private readonly gateway: RealtimeGateway) {}

  @Sse(':id/events')
  events(@Param('id') raffleId: string) {
    return this.gateway.streamForRaffle(raffleId);
  }
}
