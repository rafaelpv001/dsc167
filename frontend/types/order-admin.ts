import type { OrderStatus } from './raffle';

export interface AdminOrder {
  id: string;
  code: string;
  status: OrderStatus;
  quantity: number;
  totalPriceCents: number;
  createdAt: string;
  expiresAt: string;
  customer: { name: string; phone: string };
  raffle: { title: string };
  payment: { status: string; providerChargeId: string | null } | null;
  numbers: { number: string }[];
}
