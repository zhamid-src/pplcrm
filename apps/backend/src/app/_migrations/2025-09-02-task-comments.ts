import { Kysely } from 'kysely';

export async function down(_db: Kysely<any>): Promise<void> {
  // no-op
}

export async function up(_db: Kysely<any>): Promise<void> {
  // no-op: this file only exists to satisfy the migrator
}
