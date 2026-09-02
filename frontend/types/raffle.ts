export type RaffleStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type RaffleNumberStatus = 'AVAILABLE' | 'RESERVED' | 'PAID';
export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface RafflePublic {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  totalNumbers: number;
  unitPriceCents: number;
  endsAt: string | null;
  status: RaffleStatus;
  reservationMinutes: number;
  stats: {
    total: number;
    available: number;
    reserved: number;
    paid: number;
    soldPercentage: number;
  };
}

export interface RaffleNumberItem {
  number: string;
  status: RaffleNumberStatus;
}

export interface OrderPublic {
  id: string;
  publicToken: string;
  code: string;
  status: OrderStatus;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  expiresAt: string;
  paidAt: string | null;
  raffle: { title: string; slug: string };
  numbers: { number: string }[];
  payment: {
    status: string;
    pixQrCode: string | null;
    pixQrCodeImage: string | null;
    pixCopyPaste: string | null;
    expiresAt: string;
  } | null;
}

export interface DrawStatus {
  status: 'NOT_READY' | 'READY' | 'DRAWN';
  eligibleNumbersCount?: number;
  result?: { winningNumber: string; drawnAt: string; winnerDisplayName: string };
}
