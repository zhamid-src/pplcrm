import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

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

async function seed() {
  try {
    console.log('Seeding 200 test emails...');

    // 1. Fetch default user to associate as creator/updater
    const user = await db
      .selectFrom('authusers')
      .select(['id', 'tenant_id'])
      .limit(1)
      .executeTakeFirst();

    if (!user) {
      throw new Error('No user found in authusers table. Please sign up or seed users first.');
    }

    const userId = user.id;
    const tenantId = user.tenant_id;
    console.log(`Using userId: ${userId}, tenantId: ${tenantId}`);

    const count = 200;
    const folderId = '11'; // Inbox folder ID

    console.log(`Inserting ${count} emails into Inbox (folder ${folderId})...`);

    // Insert emails in a loop
    for (let i = 1; i <= count; i++) {
      // Space emails out by 15 minutes in the past
      const minutesAgo = i * 15;
      const dateSent = new Date(Date.now() - minutesAgo * 60 * 1000);

      // 1. Insert into 'emails'
      const emailRow = await db
        .insertInto('emails')
        .values({
          tenant_id: tenantId,
          folder_id: folderId,
          from_email: `voter.${i}@example.com`,
          to_email: 'campaign@campaignraven.com',
          subject: `Inquiry #${i}: Verification of infinite scroll performance`,
          preview: `This is a preview text for test email #${i}. Checking infinite scroll paging limits.`,
          is_favourite: i % 12 === 0,
          status: 'open',
          createdby_id: userId,
          updatedby_id: userId,
          created_at: dateSent,
          updated_at: dateSent,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const emailId = emailRow.id;

      // 2. Insert into 'email_headers'
      await db
        .insertInto('email_headers')
        .values({
          tenant_id: tenantId,
          email_id: emailId,
          date_sent: dateSent,
          headers_json: '{}', // jsonb string (non-nullable)
          raw_headers: 'From: ...\nTo: ...', // non-nullable
          has_attachments: false, // non-nullable
          createdby_id: userId,
          updatedby_id: userId,
          created_at: dateSent,
          updated_at: dateSent,
        })
        .execute();

      // 3. Insert into 'email_bodies'
      await db
        .insertInto('email_bodies')
        .values({
          tenant_id: tenantId,
          email_id: emailId,
          body_html: `<p>Dear Campaign Team,</p><p>This is message #${i} sent to test the infinite scroll and lazy loading mechanism in the shared inbox interface.</p><p>We want to ensure that pages are loaded incrementally as the user scrolls down the list, and that 40 emails are initially displayed.</p><p>Best regards,<br/>Voter #${i}</p>`,
          createdby_id: userId,
          updatedby_id: userId,
          created_at: dateSent,
          updated_at: dateSent,
        })
        .execute();

      // 4. Insert into 'email_recipients' (no audit columns, pos is smallint, kind check constr: 'to', 'cc', 'bcc')
      await db
        .insertInto('email_recipients')
        .values({
          tenant_id: tenantId,
          email_id: emailId,
          kind: 'to',
          name: 'Campaign Raven Team',
          email: 'campaign@campaignraven.com',
          pos: 0,
        })
        .execute();

      if (i % 20 === 0) {
        console.log(`Progress: ${i}/${count} emails inserted.`);
      }
    }

    console.log('✅ Successfully seeded 200 emails!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await db.destroy();
  }
}

seed();
