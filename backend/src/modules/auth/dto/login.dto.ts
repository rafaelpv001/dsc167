import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  // Aceita e-mail real (login normal) ou um identificador simples como "teste"
  // (login do ambiente de demonstração) — a validação de formato de e-mail
  // fica a critério de quem cadastra o AdminUser, não do login em si.
  @IsString()
  @MinLength(3)
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}
