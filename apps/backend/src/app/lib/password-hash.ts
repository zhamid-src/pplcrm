import argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// A valid argon2id hash computed once and reused to equalize verify timing for the
// no-such-user case. Lazily initialized so the first sign-in (not module load) pays the
// one-time hashing cost.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword('argon2-timing-equalizer-not-a-real-password');
  }
  return dummyHashPromise;
}

/**
 * Verify a candidate password against a stored hash that may be absent (the account does not
 * exist). When `hash` is null/undefined this still runs a full argon2 verify against a dummy
 * hash so a non-existent account costs the same as a wrong password, then returns false — the
 * caller can throw one uniform error and the timing can't be used to enumerate registered emails.
 */
export async function verifyPasswordConstantTime(password: string, hash: string | null | undefined): Promise<boolean> {
  const target = hash ?? (await getDummyHash());
  const valid = await argon2.verify(target, password);
  return hash != null && valid;
}
