import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // authusers columns
  await db.schema.alterTable('authusers').addColumn('createdby_id', 'bigint').execute();

  await db.schema.alterTable('authusers').addColumn('updatedby_id', 'bigint').execute();

  // authusers constraints
  await db.schema
    .alterTable('authusers')
    .addForeignKeyConstraint('fk_authusers_createdby_id', ['createdby_id'], 'authusers', ['id'])
    .execute();

  await db.schema
    .alterTable('authusers')
    .addForeignKeyConstraint('fk_authusers_updatedby_id', ['updatedby_id'], 'authusers', ['id'])
    .execute();

  // profiles columns
  await db.schema.alterTable('profiles').addColumn('createdby_id', 'bigint').execute();

  await db.schema.alterTable('profiles').addColumn('updatedby_id', 'bigint').execute();

  // profiles constraints
  await db.schema
    .alterTable('profiles')
    .addForeignKeyConstraint('fk_profiles_createdby_id', ['createdby_id'], 'authusers', ['id'])
    .execute();

  await db.schema
    .alterTable('profiles')
    .addForeignKeyConstraint('fk_profiles_updatedby_id', ['updatedby_id'], 'authusers', ['id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // profiles constraints
  await db.schema.alterTable('profiles').dropConstraint('fk_profiles_updatedby_id').execute();

  await db.schema.alterTable('profiles').dropConstraint('fk_profiles_createdby_id').execute();

  // profiles columns
  await db.schema.alterTable('profiles').dropColumn('updatedby_id').execute();

  await db.schema.alterTable('profiles').dropColumn('createdby_id').execute();

  // authusers constraints
  await db.schema.alterTable('authusers').dropConstraint('fk_authusers_updatedby_id').execute();

  await db.schema.alterTable('authusers').dropConstraint('fk_authusers_createdby_id').execute();

  // authusers columns
  await db.schema.alterTable('authusers').dropColumn('updatedby_id').execute();

  await db.schema.alterTable('authusers').dropColumn('createdby_id').execute();
}
