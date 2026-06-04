/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: change pplcrm+x@gmail.com to hello@pplcrm.com and mark verified ========');

  await db
    .updateTable('authusers')
    .set({
      email: 'hello@pplcrm.com',
      verified: true,
      role: 'owner',
      previous_email: null,
      previous_role: null,
    })
    .where((eb: any) => eb.or([eb('id', '=', 1), eb('email', '=', 'pplcrm+x@gmail.com')]))
    .execute();
}

export async function down(_db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: change pplcrm+x@gmail.com to hello@pplcrm.com ========');
}
