import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRaffleDto } from './create-raffle.dto';

// totalNumbers/startNumber never change after creation: numbers are already generated
// and renumbering would break RaffleNumber uniqueness and any existing orders/draws.
export class UpdateRaffleDto extends PartialType(
  OmitType(CreateRaffleDto, ['totalNumbers', 'startNumber'] as const),
) {}
