'use client';

const ACCESS_KEY = 'throttlelk_access';
const REFRESH_KEY = 'throttlelk_refresh';
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

function writeAccessCookie(token: string) {
  document.cookie = `${ACCESS_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
}

function clearAccessCookie() {
  document.cookie = `${ACCESS_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function saveSession(data: {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}) {
  localStorage.setItem(ACCESS_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  writeAccessCookie(data.accessToken);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  clearAccessCookie();
}

/** Copies the stored access token into a cookie so server pages can view non-public listings. */
export function syncAccessCookie() {
  const token = getAccessToken();
  if (token) writeAccessCookie(token);
  else clearAccessCookie();
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
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
