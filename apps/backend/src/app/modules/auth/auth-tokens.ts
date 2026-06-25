import { createSigner } from 'fast-jwt';
import type { Transaction } from 'kysely';
import type { Models, OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';
import { generateToken, hashToken } from '../../lib/token-hash';
import { SessionsRepo } from './repositories/sessions.repo';
import { InternalError, ServerMisconfigError } from '../../errors/app-errors';

const sessions = new SessionsRepo();

const REMEMBER_ME_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function createTokens(
  input: {
    user_id: string;
    tenant_id: string;
    name: string;
    oldSession?: string;
    ipAddress?: string;
    userAgent?: string;
    rememberMe?: boolean;
    existingExpiresAt?: Date | null;
  },
  trx?: Transaction<Models>,
): Promise<{ auth_token: string; refresh_token: string }> {
  if (input.oldSession) await sessions.deleteBySessionId(input.oldSession, trx);

  const plainSessionId = generateToken();
  const plainRefreshToken = generateToken();

  const now = new Date();
  const expiresAt =
    input.existingExpiresAt !== undefined
      ? input.existingExpiresAt
      : new Date(now.getTime() + (input.rememberMe ? REMEMBER_ME_EXPIRY_MS : SESSION_EXPIRY_MS));

  const row = {
    user_id: input.user_id,
    tenant_id: input.tenant_id,
    ip_address: input.ipAddress || '',
    user_agent: input.userAgent || '',
    status: 'active',
    session_id: hashToken(plainSessionId),
    refresh_token: hashToken(plainRefreshToken),
    expires_at: expiresAt,
    last_used_at: now,
  } as OperationDataType<'sessions', 'insert'>;

  const currentSession = await sessions.add({ row }, trx);
  if (!currentSession) throw new InternalError('Session creation failed');

  const key = process.env['SHARED_SECRET'];
  if (!key) throw new ServerMisconfigError('Server misconfiguration');

  const signer = createSigner({ algorithm: 'HS256', key, expiresIn: '30m' });
  try {
    const auth_token = signer({
      user_id: input.user_id,
      tenant_id: input.tenant_id,
      name: input.name,
      session_id: plainSessionId,
    });
    return { auth_token, refresh_token: plainRefreshToken };
  } catch (err) {
    throw new InternalError('Token creation failed', undefined, { cause: err });
  }
}
