import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PagBankClient } from './pagbank.client';
import type {
  CreatePixPaymentInput,
  CreatePixPaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  ProviderPaymentStatus,
  WebhookValidationResult,
} from '../payment-provider.interface';
import type { PagBankWebhookPayload } from './pagbank.types';

const STATUS_MAP: Record<string, ProviderPaymentStatus> = {
  PAID: 'PAID',
  AUTHORIZED: 'PAID',
  WAITING: 'PENDING',
  IN_ANALYSIS: 'PENDING',
  DECLINED: 'FAILED',
  CANCELED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
};

function mapStatus(raw: string): ProviderPaymentStatus {
  return STATUS_MAP[raw?.toUpperCase()] ?? 'PENDING';
}

@Injectable()
export class PagBankProvider implements PaymentProvider {
  readonly name = 'PAGBANK';

  constructor(
    private readonly client: PagBankClient,
    private readonly config: ConfigService,
  ) {}

  async createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentResult> {
    const webhookUrl = this.config.get<string>('pagbank.webhookUrl');

    const order = await this.client.createOrder({
      reference_id: input.referenceId,
      customer: {
        name: input.customer.name,
        phones: [
          {
            country: '55',
            area: input.customer.phone.slice(0, 2),
            number: input.customer.phone.slice(2),
          },
        ],
      },
      items: [{ name: input.description, quantity: 1, unit_amount: input.amountCents }],
      qr_codes: [
        { amount: { value: input.amountCents }, expiration_date: input.expiresAt.toISOString() },
      ],
      notification_urls: webhookUrl ? [webhookUrl] : undefined,
    });

    const qrCode = order.qr_codes[0];
    if (!qrCode) {
      throw new Error('PagBank não retornou QR Code PIX.');
    }
    const imageLink = qrCode.links?.find((l) => l.media === 'image/png')?.href ?? null;

    return {
      providerOrderId: order.id,
      providerChargeId: qrCode.id,
      pixQrCode: qrCode.text,
      pixQrCodeImage: imageLink,
      pixCopyPaste: qrCode.text,
    };
  }

  async getPaymentStatus(providerChargeId: string): Promise<PaymentStatusResult> {
    const charge = await this.client.getCharge(providerChargeId);
    return {
      providerChargeId: charge.id,
      status: mapStatus(charge.status),
      amountCents: charge.amount.value,
      paidAt: charge.paid_at ? new Date(charge.paid_at) : null,
    };
  }

  async cancelPayment(providerChargeId: string): Promise<void> {
    await this.client.cancelCharge(providerChargeId);
  }

  /**
   * Validação do webhook. A API oficial do PagBank assina notificações
   * (ver docs "Notificações" > cabeçalho de autenticidade); aqui validamos
   * um token compartilhado configurado via PAGBANK_TOKEN como defesa mínima
   * contra chamadas forjadas, usando comparação em tempo constante. Ajustar
   * para o esquema de assinatura exato (HMAC) ao configurar credenciais reais.
   */
  validateWebhook(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
  ): WebhookValidationResult {
    const token = this.config.get<string>('pagbank.token') ?? '';
    const providedToken = String(headers['x-authenticity-token'] ?? headers['authorization'] ?? '');

    const valid =
      token.length > 0 &&
      providedToken.length > 0 &&
      timingSafeEqualStrings(providedToken.replace('Bearer ', ''), token);

    let payload: PagBankWebhookPayload | null = null;
    try {
      payload = JSON.parse(rawBody.toString());
    } catch {
      payload = null;
    }

    const charge = payload?.charges?.[0];

    return {
      valid: valid && payload !== null,
      providerEventId: charge?.id ?? payload?.id ?? null,
      eventType: charge ? `charge.${charge.status?.toLowerCase()}` : 'order.unknown',
      providerChargeId: charge?.id ?? null,
      status: charge ? mapStatus(charge.status) : null,
      amountCents: charge?.amount?.value ?? null,
      paidAt: charge?.paid_at ? new Date(charge.paid_at) : null,
    };
  }
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = createHash('sha256').update(a).digest();
  const bufB = createHash('sha256').update(b).digest();
  return timingSafeEqual(bufA, bufB);
}
