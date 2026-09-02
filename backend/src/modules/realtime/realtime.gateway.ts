import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface RaffleRealtimeEvent {
  raffleId: string;
  type: 'NUMBERS_CHANGED' | 'PAYMENT_CONFIRMED' | 'DRAW_EXECUTED';
  payload?: Record<string, unknown>;
}

/**
 * Barramento de eventos em memória, exposto publicamente via Server-Sent
 * Events (ver RealtimeController). Simples e suficiente para uma única
 * instância; em múltiplas instâncias trocar por Redis pub/sub sem mudar os
 * consumidores (mesma interface `emit`/`streamForRaffle`).
 */
@Injectable()
export class RealtimeGateway {
  private readonly events$ = new Subject<RaffleRealtimeEvent>();

  emit(event: RaffleRealtimeEvent): void {
    this.events$.next(event);
  }

  streamForRaffle(raffleId: string) {
    return this.events$.asObservable().pipe(
      filter((event) => event.raffleId === raffleId),
      map((event) => ({ data: event })),
    );
  }
}
