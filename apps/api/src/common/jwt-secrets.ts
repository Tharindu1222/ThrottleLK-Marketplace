const DEFAULTS = new Set([
  'change-me-access',
  'change-me-refresh',
  'secret',
  'changeme',
]);

export function requireJwtSecrets(
  env: Record<string, string | undefined>,
  options?: { production?: boolean },
) {
  const production =
    options?.production ??
    (env.NODE_ENV ?? process.env.NODE_ENV) === 'production';
  const access = env.JWT_ACCESS_SECRET?.trim();
  const refresh = env.JWT_REFRESH_SECRET?.trim();
  if (!access) {
    throw new Error('JWT_ACCESS_SECRET must be set');
  }
  if (!refresh) {
    throw new Error('JWT_REFRESH_SECRET must be set');
  }
  if (production) {
    if (DEFAULTS.has(access) || access.length < 32) {
      throw new Error(
        'JWT_ACCESS_SECRET must be a unique value of at least 32 characters',
      );
    }
    if (DEFAULTS.has(refresh) || refresh.length < 32) {
      throw new Error(
        'JWT_REFRESH_SECRET must be a unique value of at least 32 characters',
      );
    }
    if (access === refresh) {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
    }
  }
  return { access, refresh };
}
