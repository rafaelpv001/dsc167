import { Module } from '@nestjs/common';
import { DrawsService } from './draws.service';
import { DrawsAdminController } from './draws.admin.controller';
import { DrawsPublicController } from './draws.public.controller';
import { AuditModule } from '../audit/audit.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuditModule, RealtimeModule],
  controllers: [DrawsAdminController, DrawsPublicController],
  providers: [DrawsService],
})
export class DrawsModule {}
