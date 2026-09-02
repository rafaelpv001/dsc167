import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('api')
export class OrdersPublicController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('raffles/:id/orders')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Param('id') raffleId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(raffleId, dto);
  }

  @Get('orders/:publicToken')
  findByPublicToken(@Param('publicToken') publicToken: string) {
    return this.ordersService.findByPublicToken(publicToken);
  }
}
