import { EmailService } from './email.service';

describe('EmailService production gate', () => {
  it('throws in production when RESEND_API_KEY is missing', async () => {
    const email = new EmailService({
      get: (key: string) => (key === 'NODE_ENV' ? 'production' : undefined),
    } as never);
    await expect(email.send('a@b.lk', 'Hi', '<p>x</p>')).rejects.toMatchObject({
      response: { error: { code: 'EMAIL_NOT_CONFIGURED' } },
    });
  });

  it('rejects provider errors in development so queued work can retry', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 429 }));
    const email = new EmailService({
      get: (key: string) =>
        key === 'RESEND_API_KEY' ? 'test-key' : 'development',
    } as never);
    try {
      await expect(
        email.send('audit@example.test', 'Hi', '<p>x</p>'),
      ).rejects.toMatchObject({
        response: { error: { code: 'EMAIL_SEND_FAILED' } },
      });
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('uses the queued sender, an idempotency key, and a request timeout', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const email = new EmailService({
      get: (key: string) => (key === 'RESEND_API_KEY' ? 'test-key' : undefined),
    } as never);
    try {
      await email.send('audit@example.test', 'Hi', '<p>x</p>', {
        sender: 'Snapshot <alerts@example.test>',
        idempotencyKey: 'notification/1',
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'notification/1',
          }),
          signal: expect.any(AbortSignal),
          body: JSON.stringify({
            from: 'Snapshot <alerts@example.test>',
            to: ['audit@example.test'],
            subject: 'Hi',
            html: '<p>x</p>',
          }),
        }),
      );
    } finally {
      fetchMock.mockRestore();
    }
  });
});
