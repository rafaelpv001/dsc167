import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAdmin, AuthenticatedAdmin } from '../../common/decorators/current-admin.decorator';
import { RafflesService } from './raffles.service';
import { CreateRaffleDto } from './dto/create-raffle.dto';
import { UpdateRaffleDto } from './dto/update-raffle.dto';

@Controller('api/admin/raffles')
@UseGuards(JwtAuthGuard)
export class RafflesAdminController {
  constructor(private readonly rafflesService: RafflesService) {}

  @Get()
  findAll() {
    return this.rafflesService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rafflesService.findByIdAdmin(id);
  }

  @Post()
  create(@Body() dto: CreateRaffleDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.rafflesService.create(dto, admin.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRaffleDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.rafflesService.update(id, dto, admin.id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.rafflesService.changeStatus(id, 'ACTIVE', admin.id);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.rafflesService.changeStatus(id, 'PAUSED', admin.id);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.rafflesService.changeStatus(id, 'CLOSED', admin.id);
  }
}
