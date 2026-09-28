import { resolveAdminBootstrap } from './admin-bootstrap';

describe('resolveAdminBootstrap', () => {
  it('skips bootstrap in development when env is unset', () => {
    expect(
      resolveAdminBootstrap({}, { production: false }),
    ).toBeNull();
  });

  it('refuses to start production without credentials', () => {
    expect(() =>
      resolveAdminBootstrap({}, { production: true }),
    ).toThrow(/ADMIN_BOOTSTRAP_EMAIL/);
  });

  it('refuses the documented default password in production', () => {
    expect(() =>
      resolveAdminBootstrap(
        {
          ADMIN_BOOTSTRAP_EMAIL: 'admin@throttlelk.lk',
          ADMIN_BOOTSTRAP_PASSWORD: 'ChangeMeAdmin1!',
        },
        { production: true },
      ),
    ).toThrow(/ADMIN_BOOTSTRAP_PASSWORD/);
  });

  it('returns explicit credentials in development', () => {
    expect(
      resolveAdminBootstrap(
        {
          ADMIN_BOOTSTRAP_EMAIL: 'local@throttlelk.lk',
          ADMIN_BOOTSTRAP_PASSWORD: 'ChangeMeAdmin1!',
        },
        { production: false },
      ),
    ).toEqual({
      email: 'local@throttlelk.lk',
      password: 'ChangeMeAdmin1!',
    });
  });
});
