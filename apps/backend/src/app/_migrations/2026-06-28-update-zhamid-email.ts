/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: change zhamid+x@gmail.com to zhamid@gmail.com and mark verified ========');

  await db
    .updateTable('authusers')
    .set({ email: 'zhamid@gmail.com', verified: true })
    .where('email', '=', 'zhamid+x@gmail.com')
    .execute();
}

export async function down(_db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: change zhamid+x@gmail.com to zhamid@gmail.com ========');
}
