import { Controller, Get, Param, Query } from '@nestjs/common';
import { RaffleNumberStatus } from '@prisma/client';
import { RaffleNumbersService } from './raffle-numbers.service';

@Controller('api/raffles')
export class RaffleNumbersController {
  constructor(private readonly service: RaffleNumbersService) {}

  @Get(':id/numbers')
  list(
    @Param('id') id: string,
    @Query('status') status?: RaffleNumberStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list(id, {
      status,
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
