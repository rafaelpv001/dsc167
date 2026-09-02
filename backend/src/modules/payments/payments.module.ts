import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookController } from './payments.webhook.controller';
import { PaymentsAdminController } from './payments.admin.controller';
import { PaymentsReconciliationJob } from './payments-reconciliation.job';
import { PagBankClient } from './providers/pagbank/pagbank.client';
import { PagBankProvider } from './providers/pagbank/pagbank.provider';
import { DemoPaymentProvider } from './providers/demo/demo-payment.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { AuditModule } from '../audit/audit.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuditModule, RealtimeModule, ConfigModule],
  controllers: [PaymentsWebhookController, PaymentsAdminController],
  providers: [
    PaymentsService,
    PaymentsReconciliationJob,
    PagBankClient,
    PagBankProvider,
    DemoPaymentProvider,
    {
      // No modo demo, troca o gateway real pelo simulador — nenhuma outra
      // parte do sistema (Order, webhook, reconciliação) precisa saber disso,
      // é exatamente o propósito da abstração PaymentProvider.
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, PagBankProvider, DemoPaymentProvider],
      useFactory: (config: ConfigService, pagbank: PagBankProvider, demo: DemoPaymentProvider) =>
        config.get<boolean>('demo.enabled') ? demo : pagbank,
    },
  ],
  exports: [PaymentsService, PaymentsReconciliationJob],
})
export class PaymentsModule {}
