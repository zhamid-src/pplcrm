import argon2 from 'argon2';
import * as bcrypt from 'bcrypt';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
    const valid = await bcrypt.compare(password, hash);
    return { valid, needsRehash: valid };
  }
  const valid = await argon2.verify(hash, password);
  return { valid, needsRehash: false };
}
