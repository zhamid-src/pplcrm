import { Kysely } from 'kysely';

/**
 * Migration to add updatedby_id audit columns to campaigns, households, and persons tables,
 * establishing foreign key constraints to authusers(id).
 */
export async function up(db: Kysely<any>): Promise<void> {
  // campaigns
  await db.schema
    .alterTable('campaigns')
    .addColumn('updatedby_id', 'bigint')
    .execute();

  await db.schema
    .alterTable('campaigns')
    .addForeignKeyConstraint('fk_campaigns_updatedby_id', ['updatedby_id'], 'authusers', ['id'])
    .execute();

  // households
  await db.schema
    .alterTable('households')
    .addColumn('updatedby_id', 'bigint')
    .execute();

  await db.schema
    .alterTable('households')
    .addForeignKeyConstraint('fk_households_updatedby_id', ['updatedby_id'], 'authusers', ['id'])
    .execute();

  // persons
  await db.schema
    .alterTable('persons')
    .addColumn('updatedby_id', 'bigint')
    .execute();

  await db.schema
    .alterTable('persons')
    .addForeignKeyConstraint('fk_persons_updatedby_id', ['updatedby_id'], 'authusers', ['id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // persons
  await db.schema
    .alterTable('persons')
    .dropConstraint('fk_persons_updatedby_id')
    .execute();

  await db.schema
    .alterTable('persons')
    .dropColumn('updatedby_id')
    .execute();

  // households
  await db.schema
    .alterTable('households')
    .dropConstraint('fk_households_updatedby_id')
    .execute();

  await db.schema
    .alterTable('households')
    .dropColumn('updatedby_id')
    .execute();

  // campaigns
  await db.schema
    .alterTable('campaigns')
    .dropConstraint('fk_campaigns_updatedby_id')
    .execute();

  await db.schema
    .alterTable('campaigns')
    .dropColumn('updatedby_id')
    .execute();
}
