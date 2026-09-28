import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string; cookie?: string };
    }>();
    const hasBearer = Boolean(request.headers.authorization);
    const hasCookie = Boolean(request.headers.cookie);
    if (!hasBearer && !hasCookie) {
      return true;
    }
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user;
  }
}
