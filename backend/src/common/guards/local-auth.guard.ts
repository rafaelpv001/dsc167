import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Valida email+senha (LocalStrategy) no endpoint de login. */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
