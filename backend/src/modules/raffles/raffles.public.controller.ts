import { Controller, Get, Param } from '@nestjs/common';
import { RafflesService } from './raffles.service';

@Controller('api/raffles')
export class RafflesPublicController {
  constructor(private readonly rafflesService: RafflesService) {}

  @Get()
  findAllActive() {
    return this.rafflesService.findAllPublicActive();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.rafflesService.findPublicBySlug(slug);
  }
}
