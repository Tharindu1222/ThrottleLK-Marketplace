import { authCookieNames, authCookieOptions } from './auth-cookies';

describe('authCookieOptions', () => {
  it('sets HttpOnly, SameSite=Lax, and Path=/', () => {
    const opts = authCookieOptions({ production: false, maxAgeMs: 1000 });
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.secure).toBe(false);
  });

  it('uses Secure and __Host- names in production', () => {
    const opts = authCookieOptions({ production: true, maxAgeMs: 1000 });
    expect(opts.secure).toBe(true);
    expect(authCookieNames(true).access).toBe('__Host-tlk_access');
    expect(authCookieNames(true).refresh).toBe('__Host-tlk_refresh');
  });
});
