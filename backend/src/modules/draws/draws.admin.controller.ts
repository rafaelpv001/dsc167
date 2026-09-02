import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAdmin, AuthenticatedAdmin } from '../../common/decorators/current-admin.decorator';
import { DrawsService } from './draws.service';

@Controller('api/admin/raffles')
@UseGuards(JwtAuthGuard)
export class DrawsAdminController {
  constructor(private readonly drawsService: DrawsService) {}

  @Get(':id/draw')
  status(@Param('id') raffleId: string) {
    return this.drawsService.getStatus(raffleId);
  }

  @Get(':id/draw/result')
  result(@Param('id') raffleId: string) {
    return this.drawsService.getAdminResult(raffleId);
  }

  @Post(':id/draw')
  execute(@Param('id') raffleId: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.drawsService.execute(raffleId, admin.id);
  }
}
