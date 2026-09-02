import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersPublicController } from './orders.public.controller';
import { OrdersAdminController } from './orders.admin.controller';
import { OrdersExpirationJob } from './orders-expiration.job';
import { DemoCleanupJob } from './demo-cleanup.job';
import { CustomersModule } from '../customers/customers.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [CustomersModule, AuditModule, RealtimeModule, forwardRef(() => PaymentsModule)],
  controllers: [OrdersPublicController, OrdersAdminController],
  providers: [OrdersService, OrdersExpirationJob, DemoCleanupJob],
  exports: [OrdersService],
})
export class OrdersModule {}
