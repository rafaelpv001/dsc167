import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('api/admin/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  dashboard() {
    return this.reportsService.dashboard();
  }

  @Get('raffles/:id')
  raffleReport(@Param('id') id: string) {
    return this.reportsService.raffleReport(id);
  }

  @Get('raffles/:id/orders.csv')
  async exportCsv(@Param('id') id: string, @Res() res: Response) {
    const csv = await this.reportsService.exportOrdersCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pedidos-${id}.csv"`);
    res.send(csv);
  }
}
