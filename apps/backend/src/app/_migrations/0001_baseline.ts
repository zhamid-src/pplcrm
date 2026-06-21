import { Kysely, sql } from 'kysely';
import * as fs from 'fs';
import * as path from 'path';

export async function up(db: Kysely<any>): Promise<void> {
  // Read the schema_dump.sql file from the same directory
  const schemaPath = path.join(__dirname, 'schema_dump.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute the raw PostgreSQL dump to establish the exact baseline
  await sql.raw(schemaSql).execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // A squashed baseline migration generally shouldn't be rolled back,
  // as dropping the entire public schema is highly destructive.
  // We throw an error here to prevent accidental database wiping.
  throw new Error('This is a baseline migration and cannot be safely rolled back.');
}
