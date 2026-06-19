/**
 * @file Service for Microsoft OAuth2 token management.
 * Handles the MSAL authorization code flow, token storage, and refresh.
 */
import { ConfidentialClientApplication, AuthorizationCodeRequest } from '@azure/msal-node';
import { Kysely } from 'kysely';
import { Models } from '../../../../../../libs/common/src/lib/kysely.models';

/** Scopes required for reading, writing, and sending mail via Microsoft Graph */
const MS_SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/Mail.Send',
  'offline_access',
];

/**
 * Microsoft OAuth service for acquiring and refreshing tokens.
 * Uses MSAL confidential client (backend-only — client secret never reaches the browser).
 */
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

  /**
   * Generates the Microsoft OAuth authorization URL.
   * The user is redirected here to consent and sign in.
   */
  public async getAuthUrl(state: string): Promise<string> {
    return this.msalApp.getAuthCodeUrl({
      scopes: MS_SCOPES,
      redirectUri: this.redirectUri,
      state,
      prompt: 'select_account',
    });
  }

  /**
   * Exchanges an authorization code for access + refresh tokens
   * and persists them to the database.
   *
   * @param code - The authorization code from Microsoft's callback
   * @param userId - The pplcrm user ID
   * @param tenantId - The pplcrm tenant ID
   */
  public async handleCallback(code: string, userId: string, tenantId: string): Promise<void> {
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

    await this.db
      .insertInto('ms_oauth_tokens')
      .values({
        tenant_id: tenantId,
        user_id: userId,
        access_token: response.accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        ms_email: response.account.username ?? null,
        delta_link: null,
        synced_at: null,
      })
      .onConflict((oc) =>
        oc.column('user_id').doUpdateSet({
          access_token: response.accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          ms_email: response.account?.username ?? null,
          updated_at: new Date(),
        }),
      )
      .execute();
  }

  /**
   * Returns a valid access token for the user, refreshing it if expired.
   *
   * @param userId - The pplcrm user ID
   * @returns A valid access token
   */
  public async getValidToken(userId: string): Promise<string> {
    const row = await this.db
      .selectFrom('ms_oauth_tokens')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!row) {
      throw new Error('No Microsoft account connected for this user');
    }

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
      throw new Error('Token refresh failed — user must reconnect their Microsoft account');
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
        access_token: response.accessToken,
        refresh_token: newRefreshToken,
        expires_at: newExpiry,
        updated_at: new Date(),
      })
      .where('user_id', '=', userId)
      .execute();

    return response.accessToken;
  }

  /**
   * Returns connection status for a user.
   */
  public async getConnectionStatus(
    userId: string,
  ): Promise<{ connected: boolean; msEmail: string | null; syncedAt: Date | null }> {
    const row = await this.db
      .selectFrom('ms_oauth_tokens')
      .select(['ms_email', 'synced_at'])
      .where('user_id', '=', userId)
      .executeTakeFirst();

    return {
      connected: !!row,
      msEmail: row?.ms_email ?? null,
      syncedAt: row?.synced_at ? new Date(row.synced_at as any) : null,
    };
  }

  /**
   * Deletes the stored tokens for a user (disconnect).
   */
  public async disconnect(userId: string): Promise<void> {
    await this.db.deleteFrom('ms_oauth_tokens').where('user_id', '=', userId).execute();
  }

  /**
   * Saves the delta link for the next incremental sync.
   */
  public async saveDeltaLink(userId: string, deltaLink: string): Promise<void> {
    await this.db
      .updateTable('ms_oauth_tokens')
      .set({ delta_link: deltaLink, synced_at: new Date(), updated_at: new Date() })
      .where('user_id', '=', userId)
      .execute();
  }

  /**
   * Returns the stored delta link for incremental sync (or null for full sync).
   */
  public async getDeltaLink(userId: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('ms_oauth_tokens')
      .select('delta_link')
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return row?.delta_link ?? null;
  }
}
