import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import configuration from './config/configuration';
import { DomainErrorFilter } from './common/filters/domain-error.filter';

import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminsModule } from './modules/admins/admins.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { CustomersModule } from './modules/customers/customers.module';
import { RafflesModule } from './modules/raffles/raffles.module';
import { RaffleNumbersModule } from './modules/raffle-numbers/raffle-numbers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DrawsModule } from './modules/draws/draws.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { InternalCronModule } from './modules/internal-cron/internal-cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    AdminsModule,
    UploadsModule,
    CustomersModule,
    RafflesModule,
    RaffleNumbersModule,
    OrdersModule,
    PaymentsModule,
    DrawsModule,
    ReportsModule,
    RealtimeModule,
    InternalCronModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule {}
