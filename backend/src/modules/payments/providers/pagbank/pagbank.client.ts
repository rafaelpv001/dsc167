import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PagBankCreateOrderRequest,
  PagBankCreateOrderResponse,
  PagBankChargeStatusResponse,
} from './pagbank.types';

const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Cliente HTTP fino para a API PagBank. Sandbox/produção controlados via
 * PAGBANK_ENVIRONMENT + PAGBANK_API_URL (nenhuma mudança de código necessária).
 * Retries com backoff exponencial apenas para falhas transitórias (timeout, 429, 5xx);
 * nunca reenvia a criação de um pedido que já pode ter sido aceito pelo gateway
 * sem reconciliar antes (ver PaymentsService.createPixForOrder).
 */
@Injectable()
export class PagBankClient {
  private readonly logger = new Logger(PagBankClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('pagbank.apiUrl') ?? 'https://sandbox.api.pagseguro.com';
  }

  private get token(): string {
    const token = this.config.get<string>('pagbank.token');
    if (!token) {
      throw new ServiceUnavailableException('PAGBANK_TOKEN não configurado.');
    }
    return token;
  }

  async createOrder(payload: PagBankCreateOrderRequest): Promise<PagBankCreateOrderResponse> {
    return this.request<PagBankCreateOrderResponse>('POST', '/orders', payload);
  }

  async getCharge(chargeId: string): Promise<PagBankChargeStatusResponse> {
    return this.request<PagBankChargeStatusResponse>('GET', `/charges/${chargeId}`);
  }

  async cancelCharge(chargeId: string): Promise<void> {
    await this.request('POST', `/charges/${chargeId}/cancel`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
          if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
            await this.backoff(attempt);
            continue;
          }
          const text = await res.text().catch(() => '');
          throw new ServiceUnavailableException(`PagBank respondeu ${res.status}: ${text}`);
        }

        if (res.status === 204) return undefined as unknown as T;
        return (await res.json()) as T;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES && this.isTransient(error)) {
          await this.backoff(attempt);
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  private isTransient(error: unknown): boolean {
    return error instanceof TypeError; // network-level failures (fetch throws TypeError)
  }

  private async backoff(attempt: number): Promise<void> {
    const delayMs = 2 ** attempt * 250;
    this.logger.warn(`Retry PagBank em ${delayMs}ms (tentativa ${attempt + 1})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
