import { createVerifier } from 'fast-jwt';
import type { IAuthKeyPayload } from '../../../../../libs/common/src';
import { env } from '../../env';
import { UnauthorizedError } from '../errors/app-errors';

const verifier = createVerifier({
  algorithms: ['HS256'],
  key: env.sharedSecret,
  ignoreExpiration: false,
});

export async function verifyAuthToken(token: string | null): Promise<IAuthKeyPayload> {
  if (!token) {
    throw new Error('Invalid token payload');
  }
  try {
    // fast-jwt verify returns the payload or throws
    const verifierResult = await verifier(token);
    // Explicitly check that we got a valid payload object with required fields
    if (!verifierResult || typeof verifierResult !== 'object') {
      throw new Error('Invalid token payload');
    }
    return verifierResult as IAuthKeyPayload;
  } catch (err) {
    throw new UnauthorizedError('Unauthorized: Invalid or expired token', undefined, { cause: err });
  }
}
