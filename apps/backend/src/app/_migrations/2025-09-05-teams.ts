/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: teams ========');

  await db.schema
    .createTable('teams')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('team_captain_id', 'bigint')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_teams_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_teams_createdby', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_teams_updatedby', ['updatedby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_teams_team_captain', ['team_captain_id'], 'persons', ['id'])
    .addPrimaryKeyConstraint('teams_pk', ['id', 'tenant_id'])
    .execute();

  await db.schema.createIndex('idx_teams_tenant').on('teams').column('tenant_id').execute();
  await db.schema.createIndex('idx_teams_captain').on('teams').column('team_captain_id').execute();

  await db.schema
    .createTable('map_teams_persons')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('team_id', 'bigint', (col) => col.notNull())
    .addColumn('person_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_map_teams_persons_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_map_teams_persons_team', ['team_id'], 'teams', ['id'])
    .addForeignKeyConstraint('fk_map_teams_persons_person', ['person_id'], 'persons', ['id'])
    .addForeignKeyConstraint('fk_map_teams_persons_created', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_map_teams_persons_updated', ['updatedby_id'], 'authusers', ['id'])
    .addUniqueConstraint('uq_map_teams_persons_team_person', ['tenant_id', 'team_id', 'person_id'])
    .addPrimaryKeyConstraint('map_teams_persons_pk', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createIndex('idx_map_teams_persons_team')
    .on('map_teams_persons')
    .columns(['tenant_id', 'team_id'])
    .execute();

  await db.schema
    .createIndex('idx_map_teams_persons_person')
    .on('map_teams_persons')
    .columns(['tenant_id', 'person_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: teams ========');
  await db.schema.dropTable('map_teams_persons').ifExists().cascade().execute();
  await db.schema.dropTable('teams').ifExists().cascade().execute();
}
