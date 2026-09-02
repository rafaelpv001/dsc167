import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protege rotas administrativas exigindo um JWT válido, enviado pelo
 * cliente via cookie HTTPOnly (ver JwtStrategy). Uso: @UseGuards(JwtAuthGuard).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
