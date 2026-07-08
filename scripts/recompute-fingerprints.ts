import * as fs from 'fs';
import * as path from 'path';
import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import Cursor from 'pg-cursor';

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

// 2. Normalization functions duplicated to prevent ESM cross-package imports/resolution issues
function norm(text?: string | null): string {
  const v = (text ?? '').toString().trim().toLowerCase();
  if (!v) return '';
  let t = v.replace(/[^a-z0-9\s]/g, ' ');

  const reps: Array<[RegExp, string]> = [
    [/\bst\.?\b/g, 'street'],
    [/\brd\.?\b/g, 'road'],
    [/\bave\.?\b/g, 'avenue'],
    [/\bav\.?\b/g, 'avenue'],
    [/\bblvd\.?\b/g, 'boulevard'],
    [/\bdr\.?\b/g, 'drive'],
    [/\bhwy\.?\b/g, 'highway'],
    [/\bwy\.?\b/g, 'way'],
    [/\bln\.?\b/g, 'lane'],
    [/\bct\.?\b/g, 'court'],
    [/\bcir\.?\b/g, 'circle'],
    [/\bpl\.?\b/g, 'place'],
    [/\bter\.?\b/g, 'terrace'],
    [/\bpkwy\.?\b/g, 'parkway'],
    [/\bn\b/g, 'north'],
    [/\bs\b/g, 'south'],
    [/\be\b/g, 'east'],
    [/\bw\b/g, 'west'],
  ];
  for (const [re, to] of reps) t = t.replace(re, to);
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

function fingerprintStreet(input: {
  street_num?: string | null;
  street1?: string | null;
  street2?: string | null;
}): string | null {
  const parts = [norm(input.street_num), norm(input.street1), norm(input.street2)].filter(Boolean);
  if (!parts.length) return null;
  return parts.join(' ');
}

function fingerprintFull(input: {
  apt?: string | null;
  street_num?: string | null;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}): string | null {
  const parts = [
    norm(input.apt),
    norm(input.street_num),
    norm(input.street1),
    norm(input.street2),
    norm(input.city),
    norm(input.state),
    norm(input.zip),
    norm(input.country),
  ].filter(Boolean);
  if (!parts.length) return null;
  return parts.join(' ');
}

// 3. Connect to database
const dialect = new PostgresDialect({
  pool: new Pool({
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 5432),
    host: process.env.DB_HOST || 'localhost',
    ssl: process.env.DB_SSL === 'true',
  }),
  cursor: Cursor,
});

const db = new Kysely<any>({ dialect });

async function main() {
  console.log('🔄 Starting address fingerprint recomputation...');

  const tenants = await db.selectFrom('tenants').select(['id', 'placeholder_household_id']).execute();

  console.log(`Found ${tenants.length} tenants in database.`);

  for (const tenant of tenants) {
    const tenantId = String(tenant.id);
    console.log(`\n🏢 Processing tenant: ${tenantId}`);

    // Query households
    const households = await db.selectFrom('households').selectAll().where('tenant_id', '=', tenantId).execute();

    console.log(`  Found ${households.length} households. Recomputing fingerprints...`);

    let updatedCount = 0;
    for (const hh of households) {
      const fp_street = fingerprintStreet({
        street_num: hh.street_num,
        street1: hh.street1,
        street2: hh.street2,
      });
      const fp_full = fingerprintFull({
        apt: hh.apt,
        street_num: hh.street_num,
        street1: hh.street1,
        street2: hh.street2,
        city: hh.city,
        state: hh.state,
        zip: hh.zip,
        country: hh.country,
      });

      if (hh.address_fp_street !== fp_street || hh.address_fp_full !== fp_full) {
        await db
          .updateTable('households')
          .set({
            address_fp_street: fp_street,
            address_fp_full: fp_full,
            updated_at: new Date(),
          })
          .where('id', '=', hh.id)
          .where('tenant_id', '=', tenantId)
          .execute();
        updatedCount++;
      }
    }
    console.log(`  Updated ${updatedCount} households with new fingerprints.`);

    // Rebuild duplicate matching table
    console.log('  Rebuilding potential duplicates table...');
    await db.deleteFrom('potential_duplicates').where('tenant_id', '=', tenantId).execute();

    const placeholderHhId = tenant.placeholder_household_id;

    // Email duplicates
    const duplicateEmails = await db
      .selectFrom('persons')
      .select([sql<string>`lower(email)`.as('email_lower')])
      .select((eb) => [eb.fn.agg<string[]>('array_agg', ['persons.id']).as('ids')])
      .where('tenant_id', '=', tenantId)
      .where('email', 'is not', null)
      .where(sql`trim(email)`, '!=', '')
      .groupBy(sql`lower(email)`)
      .having(sql`count(persons.id)`, '>', 1)
      .execute();

    // Household name duplicates
    const duplicateNamesInSameHousehold = await db
      .selectFrom('persons')
      .select([
        sql<string>`lower(first_name)`.as('first_name_lower'),
        sql<string>`lower(last_name)`.as('last_name_lower'),
        'household_id',
      ])
      .select((eb) => [eb.fn.agg<string[]>('array_agg', ['persons.id']).as('ids')])
      .where('tenant_id', '=', tenantId)
      .where('first_name', 'is not', null)
      .where('last_name', 'is not', null)
      .where(sql`trim(first_name)`, '!=', '')
      .where(sql`trim(last_name)`, '!=', '')
      .where('household_id', 'is not', null)
      .$if(!!placeholderHhId, (qb) => qb.where('household_id', '!=', placeholderHhId ?? ''))
      .groupBy([sql`lower(first_name)`, sql`lower(last_name)`, 'household_id'])
      .having(sql`count(persons.id)`, '>', 1)
      .execute();

    // Address name duplicates
    const duplicateNamesInSameAddress = await db
      .selectFrom('persons')
      .innerJoin('households', 'persons.household_id', 'households.id')
      .select([
        sql<string>`lower(persons.first_name)`.as('first_name_lower'),
        sql<string>`lower(persons.last_name)`.as('last_name_lower'),
        'households.address_fp_full',
      ])
      .select((eb) => [eb.fn.agg<string[]>('array_agg', ['persons.id']).as('ids')])
      .where('persons.tenant_id', '=', tenantId)
      .where('persons.first_name', 'is not', null)
      .where('persons.last_name', 'is not', null)
      .where(sql`trim(persons.first_name)`, '!=', '')
      .where(sql`trim(persons.last_name)`, '!=', '')
      .where('households.address_fp_full', 'is not', null)
      .where(sql`trim(households.address_fp_full)`, '!=', '')
      .groupBy([sql`lower(persons.first_name)`, sql`lower(persons.last_name)`, 'households.address_fp_full'])
      .having(sql`count(persons.id)`, '>', 1)
      .execute();

    const allMatchingPersonIds = new Set<string>();
    const collectIds = (groups: Array<{ ids: string[] }>) => {
      for (const g of groups) {
        if (Array.isArray(g.ids)) {
          g.ids.forEach((id) => allMatchingPersonIds.add(String(id)));
        }
      }
    };
    collectIds(duplicateEmails);
    collectIds(duplicateNamesInSameHousehold);
    collectIds(duplicateNamesInSameAddress);

    const personsMap = new Map<string, { first_name: string | null; last_name: string | null }>();
    if (allMatchingPersonIds.size > 0) {
      const dbRows = await db
        .selectFrom('persons')
        .select(['id', 'first_name', 'last_name'])
        .where('tenant_id', '=', tenantId)
        .where('id', 'in', Array.from(allMatchingPersonIds))
        .execute();
      for (const row of dbRows) {
        personsMap.set(String(row.id), { first_name: row.first_name, last_name: row.last_name });
      }
    }

    const inserts: any[] = [];

    for (const group of duplicateEmails) {
      const email = group.email_lower;
      const key = `email:${email}`;
      const reason = `Matching Email: "${email}"`;
      for (const id of group.ids) {
        inserts.push({
          tenant_id: tenantId,
          group_key: key,
          person_id: String(id),
          reason,
        });
      }
    }

    for (const group of duplicateNamesInSameHousehold) {
      const key = `household:${group.household_id}:${group.first_name_lower}:${group.last_name_lower}`;
      const firstPerson = personsMap.get(String(group.ids[0]));
      const reason =
        `Matching Name at Same Household: "${firstPerson?.first_name || ''} ${firstPerson?.last_name || ''}"`
          .replace(/\s{2,}/g, ' ')
          .trim();
      for (const id of group.ids) {
        inserts.push({
          tenant_id: tenantId,
          group_key: key,
          person_id: String(id),
          reason,
        });
      }
    }

    for (const group of duplicateNamesInSameAddress) {
      const key = `address:${group.address_fp_full}:${group.first_name_lower}:${group.last_name_lower}`;
      const firstPerson = personsMap.get(String(group.ids[0]));
      const reason = `Matching Name at Same Address: "${firstPerson?.first_name || ''} ${firstPerson?.last_name || ''}"`
        .replace(/\s{2,}/g, ' ')
        .trim();
      for (const id of group.ids) {
        inserts.push({
          tenant_id: tenantId,
          group_key: key,
          person_id: String(id),
          reason,
        });
      }
    }

    if (inserts.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < inserts.length; i += chunkSize) {
        const chunk = inserts.slice(i, i + chunkSize);
        await db.insertInto('potential_duplicates').values(chunk).execute();
      }
      console.log(`  Inserted ${inserts.length} potential duplicate links.`);
    } else {
      console.log('  No duplicate records found.');
    }
  }

  console.log('\n✅ Address fingerprint recomputation complete!');
}

main()
  .catch((err) => {
    console.error('❌ Error executing script:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.destroy();
  });
