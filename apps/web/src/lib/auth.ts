'use client';

const USER_KEY = 'throttlelk_user';

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  roles: string[];
  emailVerifiedAt?: string | null;
  avatarUrl?: string | null;
};

export function saveSession(data: { user: AuthUser }) {
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  window.dispatchEvent(new Event('throttlelk-session'));
}

/** HttpOnly cookies hold JWTs. A stored user is only a UI hint. */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return getStoredUser() ? 'cookie' : null;
}

export function getRefreshToken(): string | null {
  return getAccessToken();
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('throttlelk_access');
  localStorage.removeItem('throttlelk_refresh');
  window.dispatchEvent(new Event('throttlelk-session'));
}

export function syncAccessCookie() {
  // Tokens are HttpOnly; nothing to copy into JS-visible cookies. ASVS 3.3.4
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export const ACCESS_COOKIE_NAMES = ['__Host-tlk_access', 'tlk_access'] as const;
