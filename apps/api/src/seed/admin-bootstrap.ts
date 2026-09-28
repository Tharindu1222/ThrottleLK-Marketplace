const WEAK_ADMIN_PASSWORDS = new Set([
  'ChangeMeAdmin1!',
  'changeme',
  'admin',
  'password',
  'Password1',
]);

export function resolveAdminBootstrap(
  env: Record<string, string | undefined>,
  options?: { production?: boolean },
): { email: string; password: string } | null {
  const production =
    options?.production ??
    (env.NODE_ENV ?? process.env.NODE_ENV) === 'production';
  const email = env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  const password = env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    if (production) {
      throw new Error(
        'ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set in production',
      );
    }
    return null;
  }

  if (production) {
    if (WEAK_ADMIN_PASSWORDS.has(password) || password.length < 12) {
      throw new Error(
        'ADMIN_BOOTSTRAP_PASSWORD must be a unique value of at least 12 characters',
      );
    }
  }

  return { email, password };
}
