import { Module } from '@nestjs/common';
import { InternalCronController } from './internal-cron.controller';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [OrdersModule, PaymentsModule],
  controllers: [InternalCronController],
})
export class InternalCronModule {}
