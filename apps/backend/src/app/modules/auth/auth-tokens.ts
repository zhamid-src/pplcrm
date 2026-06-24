import { createSigner } from 'fast-jwt';
import type { Transaction } from 'kysely';
import type { Models, OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';
import { generateToken, hashToken } from '../../lib/token-hash';
import { SessionsRepo } from './repositories/sessions.repo';
import { InternalError, ServerMisconfigError } from '../../errors/app-errors';

const sessions = new SessionsRepo();

export async function createTokens(
  input: {
    user_id: string;
    tenant_id: string;
    name: string;
    oldSession?: string;
    ipAddress?: string;
    userAgent?: string;
  },
  trx?: Transaction<Models>,
): Promise<{ auth_token: string; refresh_token: string }> {
  if (input.oldSession) await sessions.deleteBySessionId(input.oldSession, trx);

  const plainSessionId = generateToken();
  const plainRefreshToken = generateToken();

  const row = {
    user_id: input.user_id,
    tenant_id: input.tenant_id,
    ip_address: input.ipAddress || '',
    user_agent: input.userAgent || '',
    status: 'active',
    session_id: hashToken(plainSessionId),
    refresh_token: hashToken(plainRefreshToken),
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
