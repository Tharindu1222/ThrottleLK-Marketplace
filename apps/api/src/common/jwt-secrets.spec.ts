import { requireJwtSecrets } from './jwt-secrets';

describe('requireJwtSecrets', () => {
  it('rejects missing secrets always, and defaults in production', () => {
    expect(() => requireJwtSecrets({})).toThrow(/JWT_ACCESS_SECRET/);
    expect(() =>
      requireJwtSecrets(
        {
          JWT_ACCESS_SECRET: 'change-me-access',
          JWT_REFRESH_SECRET: 'change-me-refresh',
        },
        { production: true },
      ),
    ).toThrow(/JWT_ACCESS_SECRET/);
    expect(
      requireJwtSecrets(
        {
          JWT_ACCESS_SECRET: 'change-me-access',
          JWT_REFRESH_SECRET: 'change-me-refresh',
        },
        { production: false },
      ).access,
    ).toBe('change-me-access');
  });

  it('rejects identical access and refresh secrets', () => {
    const secret = 'a'.repeat(32);
    expect(() =>
      requireJwtSecrets(
        {
          JWT_ACCESS_SECRET: secret,
          JWT_REFRESH_SECRET: secret,
        },
        { production: true },
      ),
    ).toThrow(/differ/);
  });

  it('accepts distinct 32+ character secrets', () => {
    const result = requireJwtSecrets({
      JWT_ACCESS_SECRET: 'access-secret-value-32chars-min!!',
      JWT_REFRESH_SECRET: 'refresh-secret-value-32chars-min!',
    });
    expect(result.access).toHaveLength(33);
    expect(result.refresh).not.toEqual(result.access);
  });
});
