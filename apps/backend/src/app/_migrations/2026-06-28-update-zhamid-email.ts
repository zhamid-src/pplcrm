/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: change zhamid+x@gmail.com to zhamid@gmail.com and mark verified ========');

  await db
    .updateTable('authusers')
    .set({
      email: 'zhamid@gmail.com',
      verified: true,
      role: 'owner',
      previous_email: null,
      previous_role: null,
    })
    .where((eb: any) => eb.or([eb('id', '=', 1), eb('email', '=', 'zhamid+x@gmail.com')]))
    .execute();
}

export async function down(_db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: change zhamid+x@gmail.com to zhamid@gmail.com ========');
}
