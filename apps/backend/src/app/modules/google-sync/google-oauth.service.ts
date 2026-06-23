import { Kysely } from 'kysely';
import { Models } from '../../../../../../libs/common/src/lib/kysely.models';

export const NEEDS_FULL_SYNC = JSON.stringify({ _needs_full_sync: true });

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

export class GoogleOAuthService {
  private readonly db: Kysely<Models>;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(db: Kysely<Models>, config: { clientId: string; clientSecret: string; redirectUri: string }) {
    this.db = db;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
  }

  public getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent', // force consent to ensure refresh token is returned
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  public async handleCallback(code: string, userId: string, tenantId: string): Promise<void> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to acquire token from Google: ${errorText}`);
    }

    const data: any = await res.json();
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token; // Google only returns this on initial consent
    const expiresIn = data.expires_in ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Fetch user profile to get Google email
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let googleEmail: string | null = null;
    if (profileRes.ok) {
      const profile: any = await profileRes.json();
      googleEmail = profile.email ?? null;
    }

    const insertObj: any = {
      tenant_id: tenantId,
      user_id: userId,
      access_token: accessToken,
      expires_at: expiresAt,
      google_email: googleEmail,
      delta_link: NEEDS_FULL_SYNC,
      synced_at: null,
    };

    if (!refreshToken) {
      // If we don't have refresh token in this callback, try keeping the existing one
      const existing = await this.db
        .selectFrom('google_oauth_tokens')
        .select('refresh_token')
        .where('user_id', '=', userId)
        .executeTakeFirst();
      insertObj.refresh_token = existing?.refresh_token ?? '';
    } else {
      insertObj.refresh_token = refreshToken;
    }

    if (!insertObj.refresh_token) {
      throw new Error('Consent required to obtain refresh token. Please disconnect and reconnect.');
    }

    // Wrap the token upsert and initial sync job in a transaction (transactional outbox pattern)
    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('google_oauth_tokens')
        .values(insertObj)
        .onConflict((oc) =>
          oc.column('user_id').doUpdateSet({
            access_token: insertObj.access_token,
            refresh_token: insertObj.refresh_token,
            expires_at: insertObj.expires_at,
            google_email: insertObj.google_email,
            delta_link: NEEDS_FULL_SYNC,
            synced_at: null,
            last_sync_error: null,
            last_sync_error_at: null,
            updated_at: new Date(),
          }),
        )
        .execute();

      await trx
        .insertInto('background_jobs' as any)
        .values({
          tenant_id: tenantId,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({ type: 'google_sync', userId, tenantId, requestedBy: userId }),
          run_at: new Date(),
          max_attempts: 3,
        })
        .execute();
    });
  }

  public async getValidToken(userId: string): Promise<string> {
    const row = await this.db
      .selectFrom('google_oauth_tokens')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!row) {
      throw new Error('No Google account connected for this user');
    }

    const isExpired = new Date(row.expires_at) < new Date(Date.now() + 60_000); // refresh 1 min early
    if (!isExpired) {
      return row.access_token;
    }

    // Refresh token
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: row.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Token refresh failed: ${errorText} — user must reconnect their Google account`);
    }

    const data: any = await res.json();
    const newAccessToken = data.access_token;
    const newExpiresIn = data.expires_in ?? 3600;
    const newExpiry = new Date(Date.now() + newExpiresIn * 1000);
    const newRefreshToken = data.refresh_token ?? row.refresh_token;

    await this.db
      .updateTable('google_oauth_tokens')
      .set({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_at: newExpiry,
        updated_at: new Date(),
      })
      .where('user_id', '=', userId)
      .execute();

    return newAccessToken;
  }

  public async getConnectionStatus(
    userId: string,
  ): Promise<{ connected: boolean; googleEmail: string | null; syncedAt: Date | null; lastSyncError: string | null; lastSyncErrorAt: Date | null }> {
    const row = await this.db
      .selectFrom('google_oauth_tokens')
      .select(['google_email', 'synced_at', 'last_sync_error', 'last_sync_error_at'])
      .where('user_id', '=', userId)
      .executeTakeFirst();

    return {
      connected: !!row,
      googleEmail: row?.google_email ?? null,
      syncedAt: row?.synced_at ? new Date(row.synced_at as any) : null,
      lastSyncError: row?.last_sync_error ?? null,
      lastSyncErrorAt: row?.last_sync_error_at ? new Date(row.last_sync_error_at as any) : null,
    };
  }

  public async disconnect(userId: string): Promise<void> {
    await this.db.deleteFrom('google_oauth_tokens').where('user_id', '=', userId).execute();
  }

  public async resetDeltaLinkForTenant(tenantId: string): Promise<void> {
    await this.db
      .updateTable('google_oauth_tokens')
      .set({ delta_link: NEEDS_FULL_SYNC, updated_at: new Date() })
      .where('tenant_id', '=', tenantId)
      .execute();
  }

  public async saveDeltaLink(userId: string, deltaLink: string): Promise<void> {
    await this.db
      .updateTable('google_oauth_tokens')
      .set({ delta_link: deltaLink, synced_at: new Date(), last_sync_error: null, last_sync_error_at: null, updated_at: new Date() })
      .where('user_id', '=', userId)
      .execute();
  }

  public async recordSyncError(userId: string, error: string): Promise<void> {
    await this.db
      .updateTable('google_oauth_tokens')
      .set({ last_sync_error: error, last_sync_error_at: new Date(), updated_at: new Date() })
      .where('user_id', '=', userId)
      .execute();
  }

  public async getDeltaLink(userId: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('google_oauth_tokens')
      .select('delta_link')
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return row?.delta_link ?? null;
  }
}
