import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAdmin, AuthenticatedAdmin } from '../../common/decorators/current-admin.decorator';
import { OrdersService } from './orders.service';

@Controller('api/admin/orders')
@UseGuards(JwtAuthGuard)
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query('status') status?: OrderStatus, @Query('search') search?: string) {
    return this.ordersService.findAllAdmin({ status, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findByIdAdmin(id);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.ordersService.reject(id, admin.id, reason);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.ordersService.cancel(id, admin.id, reason);
  }
}
