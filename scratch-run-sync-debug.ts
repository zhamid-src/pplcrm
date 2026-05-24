import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { MsSyncService } from './apps/backend/src/app/modules/ms-sync/ms-sync.service';
import { MsOAuthService } from './apps/backend/src/app/modules/ms-sync/ms-oauth.service';

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
    // Retrieve first user token
    const tokenRow = await db.selectFrom('ms_oauth_tokens')
      .selectAll()
      .limit(1)
      .executeTakeFirst();
    
    if (!tokenRow) {
      console.log('No token found in database.');
      return;
    }

    console.log(`Running sync for user: ${tokenRow.user_id}, tenant: ${tokenRow.tenant_id}`);
    
    const oauthSvc = new MsOAuthService(db, {
      clientId: process.env.MS_CLIENT_ID || '',
      clientSecret: process.env.MS_CLIENT_SECRET || '',
      tenantId: 'common',
      redirectUri: 'http://localhost:3000/auth/ms/callback',
    });

    const syncSvc = new MsSyncService(db, oauthSvc);

    // Delete existing records first so they can be re-synced
    console.log('Deleting existing test emails…');
    await db.deleteFrom('email_bodies').where(sql<any>`email_id::integer >= 40`).execute();
    await db.deleteFrom('email_headers').where(sql<any>`email_id::integer >= 40`).execute();
    await db.deleteFrom('email_recipients').where(sql<any>`email_id::integer >= 40`).execute();
    await db.deleteFrom('email_attachments').where(sql<any>`email_id::integer >= 40`).execute();
    await db.deleteFrom('emails').where(sql<any>`id::integer >= 40`).execute();
    await db.updateTable('ms_oauth_tokens').set({ delta_link: null }).execute();

    console.log('Starting syncUser…');
    const result = await syncSvc.syncUser(tokenRow.user_id, tokenRow.tenant_id, tokenRow.user_id);
    console.log('Sync complete! Result:', result);

  } catch (err: any) {
    console.error('Sync failed with error:', err?.message || err);
    if (err?.stack) {
      console.error(err.stack);
    }
  } finally {
    await db.destroy();
  }
}

run();
