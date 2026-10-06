import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import type { User } from '../users/user.entity';

const mockVerifyIdToken = jest.fn();

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (options: unknown) => mockVerifyIdToken(options),
  })),
}));

describe('AuthService password hashing', () => {
  it('hashes and compares passwords', async () => {
    const hash = await bcrypt.hash('password1', 10);
    expect(await bcrypt.compare('password1', hash)).toBe(true);
    expect(await bcrypt.compare('wrong', hash)).toBe(false);
  });
});

describe('AuthService', () => {
  const originalFetch = global.fetch;

  function errorCode(err: unknown): string | undefined {
    if (!(err instanceof UnauthorizedException)) return undefined;
    const body = err.getResponse();
    if (typeof body === 'object' && body && 'error' in body) {
      return (body as { error?: { code?: string } }).error?.code;
    }
    return undefined;
  }

  function createHarness() {
    const usersService = {
      findByEmail: jest.fn(),
      findByGoogleSub: jest.fn().mockResolvedValue(null) as jest.Mock,
      createGoogleUser: jest.fn(),
      linkGoogleAccount: jest.fn(async (user: User, googleSub: string) => {
        user.googleSub = googleSub;
        if (!user.emailVerifiedAt) user.emailVerifiedAt = new Date();
        return user;
      }),
      toPublic: jest.fn((user: User) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: (user.roles ?? []).map((role) => role.name),
      })),
    };
    const sessions = {
      create: jest.fn((row: unknown) => row),
      save: jest.fn(async (row: unknown) => row),
    };
    const jwtService = {
      signAsync: jest.fn(async (_payload: unknown, opts: { secret: string }) => {
        return `signed.${opts.secret}`;
      }),
    };
    const env: Record<string, string | undefined> = {
      GOOGLE_CLIENT_ID: 'test-google-client',
      GOOGLE_CLIENT_SECRET: 'test-google-secret',
      WEB_URL: 'http://localhost:3000',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      NODE_ENV: 'test',
    };
    const service = new AuthService(
      usersService as never,
      jwtService as never,
      { get: (key: string) => env[key] } as never,
      {} as never,
      {} as never,
      sessions as never,
    );
    return { service, usersService, sessions, env };
  }

  function googleProfile(overrides: Record<string, unknown> = {}) {
    return {
      iss: 'https://accounts.google.com',
      aud: 'test-google-client',
      exp: Math.floor(Date.now() / 1000) + 3600,
      sub: 'google-sub-1',
      email: 'ada@example.com',
      email_verified: true,
      nonce: 'nonce-1',
      given_name: 'Ada',
      family_name: 'Lovelace',
      ...overrides,
    };
  }

  function mockGoogle(profile: Record<string, unknown>) {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ id_token: 'signed-id-token' }),
      text: async () => '',
    })) as unknown as typeof fetch;
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => profile,
    });
  }

  const callbackInput = {
    code: 'auth-code',
    nonce: 'nonce-1',
    codeVerifier: 'a'.repeat(43),
  };

  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('creates a new Google user and issues tokens', async () => {
    const { service, usersService, sessions } = createHarness();
    mockGoogle(googleProfile());
    usersService.createGoogleUser.mockImplementation(
      async (input: {
        email: string;
        googleSub: string;
        firstName: string;
        lastName: string;
      }) => ({
        id: 'user-new',
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        googleSub: input.googleSub,
        passwordHash: null,
        status: 'active',
        emailVerifiedAt: new Date(),
        roles: [{ name: 'buyer' }, { name: 'seller' }],
      }),
    );

    const result = await service.googleCallback(callbackInput);

    expect(usersService.createGoogleUser).toHaveBeenCalledWith({
      email: 'ada@example.com',
      googleSub: 'google-sub-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(result.accessToken).toContain('signed.');
    expect(result.refreshToken).toContain('signed.');
    expect(result.user).toMatchObject({
      id: 'user-new',
      email: 'ada@example.com',
      roles: ['buyer', 'seller'],
    });
    expect(sessions.save).toHaveBeenCalled();
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'signed-id-token',
      audience: 'test-google-client',
    });
    const fetchBody = String(
      (global.fetch as jest.Mock).mock.calls[0][1].body,
    );
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://oauth2.googleapis.com/token',
    );
    expect(fetchBody).toContain('grant_type=authorization_code');
    expect(fetchBody).toContain(
      'redirect_uri=' +
        encodeURIComponent('http://localhost:3000/auth/google/callback'),
    );
    expect(fetchBody).toContain(`code_verifier=${'a'.repeat(43)}`);
  });

  it('links an existing email without changing the password hash', async () => {
    const { service, usersService, sessions } = createHarness();
    mockGoogle(googleProfile());
    const passwordHash = 'existing-hash';
    const existing = {
      id: 'user-1',
      email: 'ada@example.com',
      passwordHash,
      googleSub: null,
      emailVerifiedAt: null,
      status: 'active',
      roles: [{ name: 'buyer' }, { name: 'seller' }],
    } as unknown as User;
    usersService.findByEmail.mockResolvedValue(existing);

    const result = await service.googleCallback(callbackInput);

    expect(usersService.linkGoogleAccount).toHaveBeenCalledWith(
      existing,
      'google-sub-1',
    );
    expect(usersService.createGoogleUser).not.toHaveBeenCalled();
    expect(existing.passwordHash).toBe(passwordHash);
    expect(existing.googleSub).toBe('google-sub-1');
    expect(existing.emailVerifiedAt).toBeInstanceOf(Date);
    expect(result.accessToken).toBeTruthy();
    expect(sessions.save).toHaveBeenCalled();
  });

  it('rejects an unverified Google email', async () => {
    const { service, usersService, sessions } = createHarness();
    mockGoogle(googleProfile({ email_verified: false }));

    await expect(service.googleCallback(callbackInput)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.googleCallback(callbackInput)).rejects.toMatchObject({
      response: {
        error: { code: 'GOOGLE_EMAIL_UNVERIFIED' },
      },
    });
    expect(usersService.createGoogleUser).not.toHaveBeenCalled();
    expect(usersService.linkGoogleAccount).not.toHaveBeenCalled();
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rejects a bad nonce', async () => {
    const { service, sessions } = createHarness();
    mockGoogle(googleProfile({ nonce: 'other-nonce' }));

    try {
      await service.googleCallback(callbackInput);
      throw new Error('expected rejection');
    } catch (err) {
      expect(errorCode(err)).toBe('GOOGLE_FAILED');
    }
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rejects a bad audience', async () => {
    const { service, sessions } = createHarness();
    mockGoogle(googleProfile({ aud: 'wrong-client' }));

    try {
      await service.googleCallback(callbackInput);
      throw new Error('expected rejection');
    } catch (err) {
      expect(errorCode(err)).toBe('GOOGLE_FAILED');
    }
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rejects an unsigned or invalid ID token', async () => {
    const { service, sessions } = createHarness();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ id_token: 'unsigned' }),
      text: async () => '',
    })) as unknown as typeof fetch;
    mockVerifyIdToken.mockRejectedValue(new Error('invalid signature'));

    try {
      await service.googleCallback(callbackInput);
      throw new Error('expected rejection');
    } catch (err) {
      expect(errorCode(err)).toBe('GOOGLE_FAILED');
    }
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('rejects a disabled account', async () => {
    const { service, usersService, sessions } = createHarness();
    mockGoogle(googleProfile());
    usersService.findByGoogleSub.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      status: 'suspended',
      passwordHash: 'hash',
      googleSub: 'google-sub-1',
      roles: [{ name: 'buyer' }],
    });

    try {
      await service.googleCallback(callbackInput);
      throw new Error('expected rejection');
    } catch (err) {
      expect(errorCode(err)).toBe('ACCOUNT_DISABLED');
    }
    expect(usersService.createGoogleUser).not.toHaveBeenCalled();
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it('still signs in with a password', async () => {
    const { service, usersService, sessions } = createHarness();
    const passwordHash = await bcrypt.hash('password1', 4);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      passwordHash,
      status: 'active',
      roles: [{ name: 'buyer' }],
    });

    const result = await service.login({
      email: 'ada@example.com',
      password: 'password1',
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(sessions.save).toHaveBeenCalled();
  });

  it('returns INVALID_CREDENTIALS for a Google-only user', async () => {
    const { service, usersService, sessions } = createHarness();
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      passwordHash: null,
      status: 'active',
      roles: [{ name: 'buyer' }],
    });

    try {
      await service.login({
        email: 'ada@example.com',
        password: 'password1',
      });
      throw new Error('expected rejection');
    } catch (err) {
      // bcrypt.compare throws on a null hash, so this code means we never called it.
      expect(errorCode(err)).toBe('INVALID_CREDENTIALS');
    }
    expect(sessions.save).not.toHaveBeenCalled();
  });
});
