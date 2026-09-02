import { IsInt, IsOptional, IsPositive, IsString, Min, MinLength } from 'class-validator';

export class CreateRaffleDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Aceita tanto uma URL absoluta quanto o caminho relativo devolvido pelo
  // endpoint de upload (/uploads/raffles/xxx.png) — por isso @IsString, não @IsUrl.
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsInt()
  @IsPositive()
  totalNumbers!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  startNumber?: number;

  @IsInt()
  @IsPositive()
  unitPriceCents!: number;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  reservationMinutes?: number;
}
