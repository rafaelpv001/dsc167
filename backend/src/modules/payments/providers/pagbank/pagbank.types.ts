// Formatos reduzidos, alinhados ao essencial da API PagBank (Orders/Charges PIX).
// A integração completa (todos os campos opcionais da API) deve ser expandida
// conforme a documentação oficial ao configurar credenciais reais.

export interface PagBankCreateOrderRequest {
  reference_id: string;
  customer: {
    name: string;
    tax_id?: string;
    email?: string;
    phones?: Array<{ country: string; area: string; number: string }>;
  };
  items: Array<{ name: string; quantity: number; unit_amount: number }>;
  qr_codes: Array<{ amount: { value: number }; expiration_date: string }>;
  notification_urls?: string[];
}

export interface PagBankQrCodeResponse {
  id: string;
  amount: { value: number };
  text: string;
  links?: Array<{ rel: string; href: string; media: string }>;
}

export interface PagBankCreateOrderResponse {
  id: string;
  reference_id: string;
  status?: string;
  qr_codes: PagBankQrCodeResponse[];
}

export interface PagBankChargeStatusResponse {
  id: string;
  status: string; // ex.: PAID, DECLINED, CANCELED, WAITING
  amount: { value: number };
  paid_at?: string;
}

export interface PagBankWebhookPayload {
  id?: string;
  reference_id?: string;
  charges?: Array<{ id: string; status: string; amount?: { value: number }; paid_at?: string }>;
}
