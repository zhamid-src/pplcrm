import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Client } from '@microsoft/microsoft-graph-client';
import { MsOAuthService } from '../apps/backend/src/app/modules/ms-sync/ms-oauth.service';

const dialect = new PostgresDialect({
  pool: new Pool({
    user: 'zeehamid',
    database: 'pplcrm',
    password: 'Eternity#1',
    port: 5432,
    host: 'localhost',
  }),
});

const db = new Kysely<any>({ dialect });

async function run() {
  try {
    const tokenRow = await db.selectFrom('ms_oauth_tokens')
      .selectAll()
      .limit(1)
      .executeTakeFirst();
    if (!tokenRow) {
      console.log('No token row found!');
      return;
    }

    const oauthSvc = new MsOAuthService(db, {
      clientId: process.env.MS_CLIENT_ID || '',
      clientSecret: process.env.MS_CLIENT_SECRET || '',
      tenantId: 'common',
      redirectUri: 'http://localhost:3000/auth/ms/callback',
    });

    const accessToken = await oauthSvc.getValidToken(tokenRow.user_id);

    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    const deltaMap = JSON.parse(tokenRow.delta_link);
    const inboxDeltaUrl = deltaMap['inbox'];
    console.log('Inbox Delta Link URL:', inboxDeltaUrl);

    if (inboxDeltaUrl) {
      const res = await client.api(inboxDeltaUrl).get();
      console.log('Inbox Delta Query Result:');
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log('No inbox delta link found.');
    }
  } catch (err) {
    console.error('Error debugging Graph:', err);
  } finally {
    await db.destroy();
  }
}

run();
