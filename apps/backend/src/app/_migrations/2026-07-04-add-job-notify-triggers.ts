import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: add job notify triggers ========');

  // Trigger function for background_jobs
  await sql`
    CREATE OR REPLACE FUNCTION notify_job_inserted()
    RETURNS TRIGGER AS $$
    BEGIN
      PERFORM pg_notify('background_jobs_channel', '');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  // Trigger for background_jobs
  await sql`
    CREATE TRIGGER trigger_notify_job_inserted
    AFTER INSERT ON background_jobs
    FOR EACH ROW
    EXECUTE FUNCTION notify_job_inserted();
  `.execute(db);

  // Trigger function for webhook_events
  await sql`
    CREATE OR REPLACE FUNCTION notify_webhook_event_inserted()
    RETURNS TRIGGER AS $$
    BEGIN
      PERFORM pg_notify('webhook_events_channel', '');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  // Trigger for webhook_events
  await sql`
    CREATE TRIGGER trigger_notify_webhook_event_inserted
    AFTER INSERT ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_webhook_event_inserted();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: remove job notify triggers ========');

  await sql`DROP TRIGGER IF EXISTS trigger_notify_job_inserted ON background_jobs;`.execute(db);
  await sql`DROP FUNCTION IF EXISTS notify_job_inserted();`.execute(db);

  await sql`DROP TRIGGER IF EXISTS trigger_notify_webhook_event_inserted ON webhook_events;`.execute(db);
  await sql`DROP FUNCTION IF EXISTS notify_webhook_event_inserted();`.execute(db);
}
