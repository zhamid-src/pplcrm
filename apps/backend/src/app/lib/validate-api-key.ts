import { TRPCError } from '@trpc/server';
import type { FastifyRequest } from 'fastify';
import { WorkspaceApiKeysRepo } from '../modules/settings/repositories/workspace-api-keys.repo';
import { verifyApiKey } from './api-key';

const repo = new WorkspaceApiKeysRepo();

/**
 * Extract API key from Authorization header and validate it.
 * Returns tenant_id if valid, throws UNAUTHORIZED TRPCError if missing/invalid.
 *
 * Header format: "Authorization: Bearer ws_<random32>"
 *
 * Note: We scan all keys (O(tenants)) because scrypt hashes are salted and can't be
 * indexed for lookup. Since we have one key per tenant (~100 max in early life),
 * this is acceptable. If scaling becomes an issue, add a SHA256 index column.
 */
export async function getTenantByApiKey(providedKey: string): Promise<string> {
  // Get all keys (one per tenant)
  const allKeys = await repo.db.selectFrom('workspace_api_keys').selectAll().execute();

  for (const keyRecord of allKeys) {
    if (verifyApiKey(providedKey, keyRecord.key_hash)) {
      // Update last_used_at for audit trail
      await repo.updateLastUsed(keyRecord.tenant_id);
      return String(keyRecord.tenant_id);
    }
  }

  // Invalid key — don't distinguish between missing and wrong to avoid enumeration
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'Invalid API key.',
  });
}

/**
 * Extract and validate API key from request Authorization header.
 */
export async function validateApiKeyFromRequest(req: FastifyRequest): Promise<string> {
  const authHeader = req.headers['authorization'];

  if (!authHeader || typeof authHeader !== 'string') {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'API key is required.',
    });
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid API key format. Use "Authorization: Bearer <key>".',
    });
  }

  const providedKey = match[1].trim();
  return getTenantByApiKey(providedKey);
}
