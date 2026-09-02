import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Res,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAdmin, AuthenticatedAdmin } from '../../common/decorators/current-admin.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const COOKIE_NAME = 'admin_token';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  login(
    @Req() req: Request & { user: AuthenticatedAdmin },
    @Res({ passthrough: true }) res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() body: LoginDto,
  ) {
    const admin = req.user;
    const token = this.authService.signToken(admin);
    const isProd = this.config.get('nodeEnv') === 'production';

    // Em produção, frontend e backend normalmente ficam em domínios
    // diferentes (ex.: dois projetos separados no Vercel) — o navegador
    // trata isso como cross-site, e SameSite=Lax bloqueia o cookie em
    // requisições feitas via fetch/XHR (só permite em navegação direta).
    // SameSite=None exige Secure=true (garantido aqui, já que isProd implica
    // HTTPS). Em desenvolvimento local (mesmo domínio, HTTP), Lax é
    // suficiente e evita exigir HTTPS local.
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 8,
      path: '/',
    });

    return { success: true, admin };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(admin.id);
    const isProd = this.config.get('nodeEnv') === 'production';
    res.clearCookie(COOKIE_NAME, { path: '/', secure: isProd, sameSite: isProd ? 'none' : 'lax' });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return { success: true, admin };
  }
}
