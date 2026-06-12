import * as fs from 'fs';
import * as path from 'path';
import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
const { Pool } = pg;

// 1. Manually load environment variables from root files if not set in process.env
function loadEnv() {
  const envFiles = ['.env.development', '.env'];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let value = trimmed.substring(index + 1).trim();
          // Remove wrapping quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

loadEnv();

function isBlankAddress(input: any): boolean {
  const fields = [
    input.home_phone,
    input.street_num,
    input.street1,
    input.street2,
    input.apt,
    input.city,
    input.state,
    input.zip,
    input.country,
  ];
  return fields.every((v) => !v || (v + '').trim().length === 0);
}

function isIncompleteAddress(input: any): boolean {
  const street1 = (input.street1 ?? '').trim();
  const city = (input.city ?? '').trim();
  const zip = (input.zip ?? '').trim();

  return !street1 || (!city && !zip);
}

// 2. Connect to database
const dialect = new PostgresDialect({
  pool: new Pool({
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 5432),
    host: process.env.DB_HOST || 'localhost',
    ssl: process.env.DB_SSL === 'true',
  }),
});

const db = new Kysely<any>({ dialect });

async function main() {
  console.log('🔄 Starting geocodes clearing and re-queuing...');

  const tenants = await db.selectFrom('tenants').select(['id', 'placeholder_household_id']).execute();

  console.log(`Found ${tenants.length} tenants in database.`);

  for (const tenant of tenants) {
    const tenantId = String(tenant.id);
    const placeholderHhId = tenant.placeholder_household_id ? String(tenant.placeholder_household_id) : null;
    console.log(`\n🏢 Processing tenant: ${tenantId}`);

    // Select all households for this tenant excluding placeholder
    let query = db.selectFrom('households').selectAll().where('tenant_id', '=', tenantId);
    if (placeholderHhId) {
      query = query.where('id', '!=', placeholderHhId);
    }
    const households = await query.execute();

    console.log(`  Found ${households.length} non-placeholder households.`);

    let clearedCount = 0;
    const jobsToQueue: any[] = [];
    const householdIdsToClear: string[] = [];

    for (const hh of households) {
      const isBlank = isBlankAddress(hh);
      const isIncomplete = isIncompleteAddress(hh);
      const isFailed = isBlank || isIncomplete;

      householdIdsToClear.push(String(hh.id));

      if (isFailed) {
        // Just clear and mark as failed, no background job
        await db
          .updateTable('households')
          .set({
            lat: null,
            lng: null,
            formatted_address: null,
            type: null,
            district: null,
            precinct: null,
            ward: null,
            geocoding_status: 'failed',
            updated_at: new Date(),
          })
          .where('id', '=', hh.id)
          .where('tenant_id', '=', tenantId)
          .execute();
      } else {
        // Clear, set status to pending, and queue job
        await db
          .updateTable('households')
          .set({
            lat: null,
            lng: null,
            formatted_address: null,
            type: null,
            district: null,
            precinct: null,
            ward: null,
            geocoding_status: 'pending',
            updated_at: new Date(),
          })
          .where('id', '=', hh.id)
          .where('tenant_id', '=', tenantId)
          .execute();

        jobsToQueue.push({
          tenant_id: tenantId,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({
            type: 'geocode_household',
            household_id: String(hh.id),
            tenant_id: tenantId,
          }),
          run_at: new Date(),
          max_attempts: 3,
        });
      }
      clearedCount++;
    }

    console.log(`  Cleared coordinates and reset status for ${clearedCount} households.`);

    if (householdIdsToClear.length > 0) {
      // Delete duplicate/existing geocode background jobs for these households to avoid clutter
      console.log('  Deleting existing geocode background jobs...');
      for (const id of householdIdsToClear) {
        await db
          .deleteFrom('background_jobs')
          .where('tenant_id', '=', tenantId)
          .where(sql`payload->>'household_id'`, '=', String(id))
          .where(sql`payload->>'type'`, '=', 'geocode_household')
          .execute();
      }
    }

    if (jobsToQueue.length > 0) {
      console.log(`  Queuing ${jobsToQueue.length} new geocoding background jobs...`);
      const chunkSize = 100;
      for (let i = 0; i < jobsToQueue.length; i += chunkSize) {
        const chunk = jobsToQueue.slice(i, i + chunkSize);
        await db.insertInto('background_jobs').values(chunk).execute();
      }
      console.log(`  Successfully queued ${jobsToQueue.length} background jobs.`);
    }
  }

  console.log('\n✅ Geocodes clearing and re-queuing complete!');
}

main()
  .catch((err) => {
    console.error('❌ Error executing script:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.destroy();
  });
