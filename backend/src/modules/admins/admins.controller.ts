import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAdmin, AuthenticatedAdmin } from '../../common/decorators/current-admin.decorator';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@Controller('api/admin/admins')
@UseGuards(JwtAuthGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  findAll() {
    return this.adminsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateAdminDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.adminsService.create(dto, admin.id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.adminsService.setActive(id, true, admin.id);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.adminsService.setActive(id, false, admin.id);
  }
}
