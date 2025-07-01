// Unit tests for password hashing utilities

import { hashPassword, comparePassword } from '../../src/utils/password.js';

describe('Password utils', () => {
  it('hashes and verifies a password', async () => {
    const pw = 'SuperSecret123!';
    const hash = await hashPassword(pw);
    expect(hash).toBeDefined();
    expect(hash).not.toEqual(pw);

    const valid = await comparePassword(pw, hash);
    expect(valid).toBe(true);

    const invalid = await comparePassword('wrongpw', hash);
    expect(invalid).toBe(false);
  });
});