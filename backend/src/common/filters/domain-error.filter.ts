import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Erro de domínio/negócio com um `code` estável para o frontend tratar
 * programaticamente (ex.: NUMBER_UNAVAILABLE, RAFFLE_CLOSED), conforme o
 * padrão de erros do plano do projeto.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = HttpStatus.BAD_REQUEST,
  ) {
    super(message);
  }
}

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    res.status(exception.status).json({
      success: false,
      code: exception.code,
      message: exception.message,
    });
  }
}
