import { clientIp, isInternalApiRequest, RATE_LIMITS } from './rate-limit';

describe('rate-limit helpers', () => {
  const originalKey = process.env.INTERNAL_API_KEY;
  const originalTrust = process.env.TRUST_PROXY;

  afterEach(() => {
    process.env.INTERNAL_API_KEY = originalKey;
    process.env.TRUST_PROXY = originalTrust;
  });

  it('keeps auth tighter than login, writes, and the global default', () => {
    expect(RATE_LIMITS.auth.limit).toBeLessThan(RATE_LIMITS.login.limit);
    expect(RATE_LIMITS.login.limit).toBeLessThan(RATE_LIMITS.write.limit);
    expect(RATE_LIMITS.write.limit).toBeLessThan(RATE_LIMITS.default.limit);
    expect(RATE_LIMITS.report.limit).toBe(RATE_LIMITS.auth.limit);
    expect(RATE_LIMITS.upload.limit).toBeLessThan(RATE_LIMITS.write.limit);
  });

  it('skips throttle only when the internal key matches', () => {
    expect(isInternalApiRequest('secret', 'secret')).toBe(true);
    expect(isInternalApiRequest('nope', 'secret')).toBe(false);
    expect(isInternalApiRequest('secret', undefined)).toBe(false);
    expect(isInternalApiRequest(undefined, 'secret')).toBe(false);
  });

  it('uses the first forwarded IP only when the proxy is trusted', () => {
    const req = {
      ip: '10.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    };
    expect(clientIp(req, true)).toBe('203.0.113.9');
    expect(clientIp(req, false)).toBe('10.0.0.1');
  });
});
