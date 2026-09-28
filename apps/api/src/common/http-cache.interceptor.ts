import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import {
  cacheControlForRequest,
  requestHasAuthCookie,
} from './http-cache.policy';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const original = req.originalUrl ?? req.url ?? '';
    const qIndex = original.indexOf('?');
    const path = qIndex === -1 ? original : original.slice(0, qIndex);
    const search = qIndex === -1 ? '' : original.slice(qIndex);
    const header = cacheControlForRequest({
      method: req.method,
      path,
      search,
      hasAuthCookie: requestHasAuthCookie(req.headers.cookie),
      hasAuthorization: Boolean(req.headers.authorization),
    });
    res.setHeader('Cache-Control', header);
    if (header.startsWith('public')) {
      res.setHeader('Vary', 'Cookie, Authorization');
    }
    return next.handle();
  }
}
