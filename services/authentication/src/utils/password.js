// Password hashing and comparison utilities

import bcrypt from 'bcryptjs';

const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, rounds);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}