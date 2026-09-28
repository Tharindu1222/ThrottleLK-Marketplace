import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn(async () => ({
              status: 'ok',
              service: 'throttlelk-api',
              database: 'skipped',
              sentry: false,
            })),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns ok payload', async () => {
    await expect(controller.getHealth()).resolves.toEqual({
      success: true,
      data: {
        status: 'ok',
        service: 'throttlelk-api',
        database: 'skipped',
        sentry: false,
      },
    });
  });
});
