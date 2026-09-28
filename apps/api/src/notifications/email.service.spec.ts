import { EmailService } from './email.service';

describe('EmailService production gate', () => {
  it('throws in production when RESEND_API_KEY is missing', async () => {
    const email = new EmailService({
      get: (key: string) =>
        key === 'NODE_ENV' ? 'production' : undefined,
    } as never);
    await expect(email.send('a@b.lk', 'Hi', '<p>x</p>')).rejects.toMatchObject({
      response: { error: { code: 'EMAIL_NOT_CONFIGURED' } },
    });
  });
});
