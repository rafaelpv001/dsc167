import { ArrayMinSize, ArrayUnique, IsArray, IsString, Matches, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  numbers!: string[];

  @IsString()
  @MinLength(3)
  customerName!: string;

  // Aceita formatos comuns de telefone/WhatsApp BR; normalização (só dígitos) é feita no service.
  @IsString()
  @Matches(/^[0-9()+\-\s]{8,20}$/)
  customerPhone!: string;
}
