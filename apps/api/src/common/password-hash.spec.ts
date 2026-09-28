import * as bcrypt from 'bcrypt';
import { BCRYPT_COST, hashPassword } from './password-hash';

describe('password hashing', () => {
  it('uses bcrypt cost 12', () => {
    expect(BCRYPT_COST).toBe(12);
  });

  it('hashes with cost 12', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(bcrypt.getRounds(hash)).toBe(12);
    expect(await bcrypt.compare('correct-horse-battery', hash)).toBe(true);
  });
});
