import { createSigner, createVerifier } from 'fast-jwt';
import { env } from '../apps/backend/src/env';

async function test() {
  // Let fast-jwt handle timestamps automatically (omit clockTimestamp)
  const signer = createSigner({
    algorithm: 'HS256',
    key: env.sharedSecret,
    expiresIn: '30m',
  });

  const token = signer({
    user_id: 'user-1',
    tenant_id: 'tenant-1',
    name: 'Test User',
    session_id: 'session-1',
  });

  console.log('Signed token:', token);

  const verifier = createVerifier({
    algorithms: ['HS256'],
    key: env.sharedSecret,
    ignoreExpiration: false,
  });

  try {
    const payload = await verifier(token);
    console.log('Verified payload (both omitting clockTimestamp):', payload);
  } catch (err) {
    console.error('Verification failed:', err);
  }
}

test();
