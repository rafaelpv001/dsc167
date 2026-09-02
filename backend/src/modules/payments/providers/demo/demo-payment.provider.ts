import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  CreatePixPaymentInput,
  CreatePixPaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  WebhookValidationResult,
} from '../payment-provider.interface';

/**
 * Provider de pagamento para o ambiente de demonstração (DEMO_MODE=true).
 * Implementa a mesma interface PaymentProvider que o PagBankProvider — não
 * chama nenhuma API externa; gera um PIX fake e nunca confirma sozinho (quem
 * decide confirmar é PaymentsService.createPixForOrder, que agenda a
 * confirmação automática simulando o cliente pagando).
 */
@Injectable()
export class DemoPaymentProvider implements PaymentProvider {
  readonly name = 'DEMO';

  async createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentResult> {
    const fakeId = randomBytes(8).toString('hex');
    const fakeCopyPaste = `00020126DEMO-AMBIENTE-DE-TESTE-${fakeId}-${input.amountCents}5204000053039865802BR5913RIFA SOLIDARIA6008TESTE`;

    return {
      providerOrderId: `demo-order-${fakeId}`,
      providerChargeId: `demo-charge-${fakeId}`,
      pixQrCode: fakeCopyPaste,
      pixQrCodeImage: null,
      pixCopyPaste: fakeCopyPaste,
    };
  }

  async getPaymentStatus(providerChargeId: string): Promise<PaymentStatusResult> {
    // Nunca é chamado no fluxo demo (PaymentsService confirma via timer), mas
    // implementado para manter a interface íntegra caso a reconciliação rode.
    return { providerChargeId, status: 'PENDING', amountCents: 0, paidAt: null };
  }

  async cancelPayment(): Promise<void> {
    // no-op: não há cobrança real para cancelar no gateway.
  }

  validateWebhook(): WebhookValidationResult {
    return {
      valid: false,
      providerEventId: null,
      eventType: 'demo.unused',
      providerChargeId: null,
      status: null,
      amountCents: null,
      paidAt: null,
    };
  }
}
