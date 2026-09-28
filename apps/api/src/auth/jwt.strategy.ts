import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  authCookieNames,
  isProductionEnv,
  readCookie,
} from '../common/auth-cookies';
import { requireJwtSecrets } from '../common/jwt-secrets';
import { UsersService } from '../users/users.service';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const { access } = requireJwtSecrets({
      NODE_ENV: config.get<string>('NODE_ENV') ?? process.env.NODE_ENV,
      JWT_ACCESS_SECRET:
        config.get<string>('JWT_ACCESS_SECRET') ?? process.env.JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET:
        config.get<string>('JWT_REFRESH_SECRET') ??
        process.env.JWT_REFRESH_SECRET,
    });
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: { headers?: { cookie?: string } }) => {
          const production = isProductionEnv();
          const names = authCookieNames(production);
          const header = req?.headers?.cookie;
          return (
            readCookie(header, names.access) ??
            readCookie(header, authCookieNames(false).access) ??
            null
          );
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: access,
    });
  }

  async validate(payload: JwtPayload) {
    return this.usersService.findByIdOrThrow(payload.sub);
  }
}
