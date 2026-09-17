import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'success' in body) {
        response.status(status).json(body);
        return;
      }
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        response.setHeader('Retry-After', '60');
        response.status(status).json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Try again in a minute.',
          },
        });
        return;
      }
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
      response.status(status).json({
        success: false,
        error: {
          code: HttpStatus[status] ?? 'ERROR',
          message: Array.isArray(message) ? message.join(', ') : message,
        },
      });
      return;
    }

    console.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          exception instanceof Error
            ? exception.message
            : 'Unexpected server error',
      },
    });
  }
}
