import type { AuthorizationCodeRequest } from '@azure/msal-node';
import { ConfidentialClientApplication } from '@azure/msal-node';
import type { Kysely } from 'kysely';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { decryptSecret, encryptSecret } from '../../lib/secret-crypto';

export const NEEDS_FULL_SYNC = JSON.stringify({ _needs_full_sync: true });

const MS_SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/Mail.Send',
  'offline_access',
];

export class MsOAuthService {
  private readonly msalApp: ConfidentialClientApplication;
  private readonly db: Kysely<Models>;
  private readonly redirectUri: string;

  constructor(
    db: Kysely<Models>,
    config: { clientId: string; clientSecret: string; tenantId: string; redirectUri: string },
  ) {
    this.db = db;
    this.redirectUri = config.redirectUri;
    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
    });
  }

  public async getAuthUrl(state: string): Promise<string> {
    return this.msalApp.getAuthCodeUrl({
      scopes: MS_SCOPES,
      redirectUri: this.redirectUri,
      state,
      prompt: 'select_account',
    });
  }

  public async handleCallback(code: string, connectedBy: string, tenantId: string, campaignId: string): Promise<void> {
    const request: AuthorizationCodeRequest = {
      code,
      scopes: MS_SCOPES,
      redirectUri: this.redirectUri,
    };

    const response = await this.msalApp.acquireTokenByCode(request);
    if (!response?.accessToken || !response.account) {
      throw new Error('Failed to acquire token from Microsoft');
    }

    const expiresAt = response.expiresOn ?? new Date(Date.now() + 3600 * 1000);

    // Retrieve the refresh token from the MSAL cache
    const cache = this.msalApp.getTokenCache().serialize();
    const parsedCache = JSON.parse(cache);
    const refreshTokenEntry = Object.values(parsedCache.RefreshToken ?? {}) as any[];
    const refreshToken = refreshTokenEntry[0]?.secret ?? '';

    // Wrap the token upsert and initial sync job in a transaction (transactional outbox pattern)
    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('ms_oauth_tokens')
        .values({
          tenant_id: tenantId,
          campaign_id: campaignId,
          user_id: connectedBy,
          access_token: encryptSecret(response.accessToken),
          refresh_token: encryptSecret(refreshToken),
          expires_at: expiresAt,
          ms_email: response.account?.username ?? null,
          delta_link: NEEDS_FULL_SYNC,
          synced_at: null,
        })
        .onConflict((oc) =>
          oc.columns(['tenant_id', 'campaign_id']).doUpdateSet({
            user_id: connectedBy,
            access_token: encryptSecret(response.accessToken),
            refresh_token: encryptSecret(refreshToken),
            expires_at: expiresAt,
            ms_email: response.account?.username ?? null,
            delta_link: NEEDS_FULL_SYNC,
            synced_at: null,
            last_sync_error: null,
            last_sync_error_at: null,
            updated_at: new Date(),
          }),
        )
        .execute();

      await trx
        .insertInto('background_jobs')
        .values({
          tenant_id: tenantId,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({ type: 'ms_sync', tenantId, campaignId, requestedBy: connectedBy }),
          run_at: new Date(),
          max_attempts: 3,
        })
        .execute();
    });
  }

  public async getValidToken(tenantId: string, campaignId: string): Promise<string> {
    const row = await this.db
      .selectFrom('ms_oauth_tokens')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .executeTakeFirst();

    if (!row) {
      throw new Error('No Microsoft account connected for this campaign');
    }

    // Decrypt at the DB read boundary so the rest of this method works in plaintext.
    row.access_token = decryptSecret(row.access_token);
    row.refresh_token = decryptSecret(row.refresh_token);

    const isExpired = new Date(row.expires_at) < new Date(Date.now() + 60_000); // refresh 1 min early
    if (!isExpired) {
      return row.access_token;
    }

    // Refresh via MSAL silent flow
    const response = await this.msalApp.acquireTokenByRefreshToken({
      refreshToken: row.refresh_token,
      scopes: MS_SCOPES,
    });

    if (!response?.accessToken) {
      throw new Error('Token refresh failed — tenant must reconnect their Microsoft account');
    }

    const newExpiry = response.expiresOn ?? new Date(Date.now() + 3600 * 1000);

    // Retrieve fresh refresh token from cache
    const cache = this.msalApp.getTokenCache().serialize();
    const parsedCache = JSON.parse(cache);
    const refreshTokenEntry = Object.values(parsedCache.RefreshToken ?? {}) as any[];
    const newRefreshToken = refreshTokenEntry[0]?.secret ?? row.refresh_token;

    await this.db
      .updateTable('ms_oauth_tokens')
      .set({
        access_token: encryptSecret(response.accessToken),
        refresh_token: encryptSecret(newRefreshToken),
        expires_at: newExpiry,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .execute();

    return response.accessToken;
  }

  public async getConnectionStatus(
    tenantId: string,
    campaignId: string,
  ): Promise<{
    connected: boolean;
    msEmail: string | null;
    syncedAt: Date | null;
    lastSyncError: string | null;
    lastSyncErrorAt: Date | null;
  }> {
    const row = await this.db
      .selectFrom('ms_oauth_tokens')
      .select(['ms_email', 'synced_at', 'last_sync_error', 'last_sync_error_at'])
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .executeTakeFirst();

    return {
      connected: !!row,
      msEmail: row?.ms_email ?? null,
      syncedAt: row?.synced_at ? new Date(row.synced_at as any) : null,
      lastSyncError: row?.last_sync_error ?? null,
      lastSyncErrorAt: row?.last_sync_error_at ? new Date(row.last_sync_error_at as any) : null,
    };
  }

  public async disconnect(tenantId: string, campaignId: string): Promise<void> {
    await this.db
      .deleteFrom('ms_oauth_tokens')
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .execute();
  }

  public async saveDeltaLink(tenantId: string, campaignId: string, deltaLink: string): Promise<void> {
    await this.db
      .updateTable('ms_oauth_tokens')
      .set({
        delta_link: deltaLink,
        synced_at: new Date(),
        last_sync_error: null,
        last_sync_error_at: null,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .execute();
  }

  public async recordSyncError(tenantId: string, campaignId: string, error: string): Promise<void> {
    await this.db
      .updateTable('ms_oauth_tokens')
      .set({ last_sync_error: error, last_sync_error_at: new Date(), updated_at: new Date() })
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .execute();
  }

  public async getDeltaLink(tenantId: string, campaignId: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('ms_oauth_tokens')
      .select('delta_link')
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .executeTakeFirst();
    return row?.delta_link ?? null;
  }

  public async resetDeltaLink(tenantId: string, campaignId: string): Promise<void> {
    await this.db
      .updateTable('ms_oauth_tokens')
      .set({ delta_link: NEEDS_FULL_SYNC, updated_at: new Date() })
      .where('tenant_id', '=', tenantId)
      .where('campaign_id', '=', campaignId)
      .execute();
  }
}
