export interface CreatePixPaymentInput {
  orderId: string;
  referenceId: string;
  amountCents: number;
  description: string;
  expiresAt: Date;
  customer: { name: string; phone: string };
}

export interface CreatePixPaymentResult {
  providerOrderId: string;
  providerChargeId: string;
  pixQrCode: string;
  pixQrCodeImage: string | null;
  pixCopyPaste: string;
}

export type ProviderPaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED';

export interface PaymentStatusResult {
  providerChargeId: string;
  status: ProviderPaymentStatus;
  amountCents: number;
  paidAt: Date | null;
}

export interface WebhookValidationResult {
  valid: boolean;
  providerEventId: string | null;
  eventType: string;
  providerChargeId: string | null;
  status: ProviderPaymentStatus | null;
  amountCents: number | null;
  paidAt: Date | null;
}

/**
 * Abstração de gateway de pagamento. Novos gateways (Mercado Pago, Asaas, Efí,
 * Stripe...) implementam esta interface sem exigir mudanças em Order/Payment.
 */
export interface PaymentProvider {
  readonly name: string;
  createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentResult>;
  getPaymentStatus(providerChargeId: string): Promise<PaymentStatusResult>;
  cancelPayment(providerChargeId: string): Promise<void>;
  /** Verifica autenticidade do webhook (assinatura/token) e extrai os dados relevantes. */
  validateWebhook(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
  ): WebhookValidationResult;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
