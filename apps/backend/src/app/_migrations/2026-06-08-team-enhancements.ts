/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: team-enhancements ========');

  // 1. Create map_teams_lists table
  await db.schema
    .createTable('map_teams_lists')
    .addColumn('id', 'bigserial', (col) => col.unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('team_id', 'bigint', (col) => col.notNull())
    .addColumn('list_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('updatedby_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
    .addForeignKeyConstraint('fk_map_teams_lists_tenant', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_map_teams_lists_team', ['team_id'], 'teams', ['id'])
    .addForeignKeyConstraint('fk_map_teams_lists_list', ['list_id'], 'lists', ['id'])
    .addForeignKeyConstraint('fk_map_teams_lists_createdby', ['createdby_id'], 'authusers', ['id'])
    .addForeignKeyConstraint('fk_map_teams_lists_updatedby', ['updatedby_id'], 'authusers', ['id'])
    .addUniqueConstraint('uq_map_teams_lists_team_list', ['tenant_id', 'team_id', 'list_id'])
    .addPrimaryKeyConstraint('map_teams_lists_pk', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createIndex('idx_map_teams_lists_team')
    .on('map_teams_lists')
    .columns(['tenant_id', 'team_id'])
    .execute();

  // 2. Alter teams table to add team_lead_user_id column
  await db.schema
    .alterTable('teams')
    .addColumn('team_lead_user_id', 'bigint')
    .execute();

  await db.schema
    .alterTable('teams')
    .addForeignKeyConstraint('fk_teams_team_lead_user', ['team_lead_user_id'], 'authusers', ['id'])
    .execute();

  await db.schema
    .createIndex('idx_teams_lead_user')
    .on('teams')
    .column('team_lead_user_id')
    .execute();

  // 3. Alter tasks table to add team_id column
  await db.schema
    .alterTable('tasks')
    .addColumn('team_id', 'bigint')
    .execute();

  await db.schema
    .alterTable('tasks')
    .addForeignKeyConstraint('fk_tasks_team_id', ['team_id'], 'teams', ['id'])
    .execute();

  await db.schema
    .createIndex('idx_tasks_team_id')
    .on('tasks')
    .column('team_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: team-enhancements ========');

  // Remove constraints and columns on tasks
  await db.schema.alterTable('tasks').dropConstraint('fk_tasks_team_id').execute();
  await db.schema.alterTable('tasks').dropColumn('team_id').execute();

  // Remove constraints and columns on teams
  await db.schema.alterTable('teams').dropConstraint('fk_teams_team_lead_user').execute();
  await db.schema.alterTable('teams').dropColumn('team_lead_user_id').execute();

  // Drop map_teams_lists table
  await db.schema.dropTable('map_teams_lists').ifExists().cascade().execute();
}
