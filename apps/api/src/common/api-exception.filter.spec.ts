import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  it('maps 429 to RATE_LIMITED with Retry-After', () => {
    const json = jest.fn();
    const setHeader = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status, setHeader }),
      }),
    };

    new ApiExceptionFilter().catch(
      new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS),
      host as never,
    );

    expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(status).toHaveBeenCalledWith(429);
  });

  it('hides non-HTTP exception messages from clients', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status, setHeader: jest.fn() }),
      }),
    };

    new ApiExceptionFilter().catch(
      new Error('relation "users" does not exist'),
      host as never,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected server error',
      },
    });
  });
});
