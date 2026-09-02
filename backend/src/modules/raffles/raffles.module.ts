import { Module } from '@nestjs/common';
import { RafflesService } from './raffles.service';
import { RafflesAdminController } from './raffles.admin.controller';
import { RafflesPublicController } from './raffles.public.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RafflesAdminController, RafflesPublicController],
  providers: [RafflesService],
  exports: [RafflesService],
})
export class RafflesModule {}
