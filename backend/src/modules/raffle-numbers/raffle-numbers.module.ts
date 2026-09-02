import { Module } from '@nestjs/common';
import { RaffleNumbersService } from './raffle-numbers.service';
import { RaffleNumbersController } from './raffle-numbers.controller';

@Module({
  controllers: [RaffleNumbersController],
  providers: [RaffleNumbersService],
})
export class RaffleNumbersModule {}
