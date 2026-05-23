import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Client } from '@microsoft/microsoft-graph-client';

const dialect = new PostgresDialect({
  pool: new Pool({
    user: 'pplcrm',
    database: 'pplcrm',
    password: '[REDACTED]',
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

    const client = Client.init({
      authProvider: (done) => done(null, tokenRow.access_token),
    });

    // Let's get the message details for "with attachment"
    // ID from preview in db: AQMkADAwATNiZmYAZC05OQFjLWQxNjktMDACLTAwCgBGAAADB_sGgQ-eb0C3lnVXxCc2LQcARm-wDFnqPEaYkzbfA_Y2nwAAAgEMAAAARm-wDFnqPEaYkzbfA_Y2nwAJem3QSQAAAA==
    const msgId = 'AQMkADAwATNiZmYAZC05OQFjLWQxNjktMDACLTAwCgBGAAADB_sGgQ-eb0C3lnVXxCc2LQcARm-wDFnqPEaYkzbfA_Y2nwAAAgEMAAAARm-wDFnqPEaYkzbfA_Y2nwAJem3QSgAAAA==';
    
    console.log('Fetching message details...');
    const message = await client.api(`/me/messages/${msgId}`).get();
    console.log('Message details:');
    console.log('hasAttachments:', message.hasAttachments);
    console.log('subject:', message.subject);

    console.log('Fetching attachments...');
    const attRes = await client.api(`/me/messages/${msgId}/attachments`).get();
    console.log('Attachments count:', attRes.value?.length);
    console.log('Attachments data structure:');
    console.log(JSON.stringify(attRes.value, null, 2));

  } catch (err) {
    console.error('Error debugging Graph:', err);
  } finally {
    await db.destroy();
  }
}

run();
