import * as bcrypt from 'bcrypt';

/** OWASP / ASVS password storage — bcrypt cost 12. */
export const BCRYPT_COST = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_COST);
}
