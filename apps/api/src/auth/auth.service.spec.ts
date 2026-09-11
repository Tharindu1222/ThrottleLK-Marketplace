import * as bcrypt from 'bcrypt';

describe('AuthService password hashing', () => {
  it('hashes and compares passwords', async () => {
    const hash = await bcrypt.hash('password1', 10);
    expect(await bcrypt.compare('password1', hash)).toBe(true);
    expect(await bcrypt.compare('wrong', hash)).toBe(false);
  });
});
