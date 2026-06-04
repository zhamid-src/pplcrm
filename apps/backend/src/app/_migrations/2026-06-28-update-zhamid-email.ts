/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: change pplcrm+x@gmail.com to hello@pplcrm.com and mark verified ========');

  await db
    .updateTable('authusers')
    .set({ email: 'hello@pplcrm.com', verified: true })
    .where('email', '=', 'pplcrm+x@gmail.com')
    .execute();
}

export async function down(_db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: change pplcrm+x@gmail.com to hello@pplcrm.com ========');
}
