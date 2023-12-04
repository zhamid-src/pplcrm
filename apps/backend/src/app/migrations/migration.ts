/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up ========');

  await db.schema
    .createTable('users')
    .addColumn('id', 'bigint', (col) => col.primaryKey().generatedByDefaultAsIdentity().unique())
    .addColumn('tenant_id', 'bigint')
    .addColumn('username', 'varchar(100)')
    .addColumn('role', 'varchar(100)')
    .addColumn('first_name', 'varchar(100)')
    .addColumn('middle_names', 'varchar(100)')
    .addColumn('last_name', 'varchar(100)')
    .addColumn('home_phone', 'varchar(100)')
    .addColumn('mobile', 'varchar(100)')
    .addColumn('email', 'varchar(255)')
    .addColumn('email2', 'varchar(255)')
    .addColumn('street1', 'varchar(255)')
    .addColumn('street2', 'varchar(255)')
    .addColumn('city', 'varchar(100)')
    .addColumn('state', 'varchar(100)')
    .addColumn('zip', 'varchar(32)')
    .addColumn('country', 'varchar(100)')
    .addColumn('json', 'jsonb')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  await db.schema.createIndex('user_tenant_username_index').on('users').columns(['tenant_id', 'username']).execute();

  await db.schema
    .createTable('tenants')
    .addColumn('id', 'bigint', (col) => col.primaryKey().generatedByDefaultAsIdentity().unique())
    .addColumn('admin_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('mobile', 'varchar(100)')
    .addColumn('email', 'varchar(255)')
    .addColumn('email2', 'varchar(255)')
    .addColumn('street1', 'varchar(255)')
    .addColumn('street2', 'varchar(255)')
    .addColumn('city', 'varchar(100)')
    .addColumn('state', 'varchar(100)')
    .addColumn('zip', 'varchar(32)')
    .addColumn('country', 'varchar(100)')
    .addColumn('billing_street1', 'varchar(255)', (col) => col.notNull())
    .addColumn('billing_street2', 'varchar(255)', (col) => col.notNull())
    .addColumn('billing_city', 'varchar(100)', (col) => col.notNull())
    .addColumn('billing_state', 'varchar(100)', (col) => col.notNull())
    .addColumn('billing_zip', 'varchar(32)', (col) => col.notNull())
    .addColumn('billing_country', 'varchar(100)', (col) => col.notNull())
    .addColumn('notes', 'varchar')
    .addColumn('json', 'jsonb')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_admin_id', ['admin_id'], 'users', ['id'])
    .addForeignKeyConstraint('fk_createdby_id', ['createdby_id'], 'users', ['id'])
    .execute();

  await db.schema
    .alterTable('users')
    .addForeignKeyConstraint('fk_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .execute();

  await db.schema
    .createTable('campaigns')
    .addColumn('id', 'bigint', (col) => col.generatedByDefaultAsIdentity().unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('admin_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('notes', 'varchar')
    .addColumn('json', 'jsonb')
    .addColumn('startdate', 'time')
    .addColumn('enddate', 'time')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_admin_id', ['admin_id'], 'users', ['id'])
    .addForeignKeyConstraint('fk_createdby_id', ['createdby_id'], 'users', ['id'])
    .addPrimaryKeyConstraint('campaigns_id_tenantid', ['id', 'tenant_id'])
    .execute();

  await db.schema.createIndex('campaigns_tenant_index').on('campaigns').column('tenant_id').execute();

  await db.schema
    .createTable('map_campaigns_users')
    .addColumn('id', 'bigint', (col) => col.generatedByDefaultAsIdentity())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('campaign_id', 'bigint', (col) => col.notNull())
    .addColumn('user_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_user_id', ['user_id'], 'users', ['id'])
    .addForeignKeyConstraint('fk_campaign_id', ['campaign_id'], 'campaigns', ['id'])
    .addPrimaryKeyConstraint('map_campaigns_id_tenantid', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createIndex('campaigns_map_tenant_user_index')
    .on('map_campaigns_users')
    .columns(['tenant_id', 'user_id'])
    .execute();

  await db.schema
    .createIndex('campaigns_map_tenant_campaign_index')
    .on('map_campaigns_users')
    .columns(['tenant_id', 'campaign_id'])
    .execute();

  await db.schema
    .createTable('households')
    .addColumn('id', 'bigint', (col) => col.generatedByDefaultAsIdentity().unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('campaign_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('file_id', 'bigint')
    .addColumn('home_phone', 'varchar(100)')
    .addColumn('street1', 'varchar(255)')
    .addColumn('street2', 'varchar(255)')
    .addColumn('city', 'varchar(100)')
    .addColumn('state', 'varchar(100)')
    .addColumn('zip', 'varchar(32)')
    .addColumn('country', 'varchar(100)')
    .addColumn('notes', 'varchar')
    .addColumn('json', 'jsonb')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_campaign_id', ['campaign_id'], 'campaigns', ['id'])
    .addForeignKeyConstraint('fk_createdby_id', ['createdby_id'], 'users', ['id'])
    .addPrimaryKeyConstraint('households_id_tenantid', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createTable('persons')
    .addColumn('id', 'bigint', (col) => col.generatedByDefaultAsIdentity().unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('campaign_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('household_id', 'bigint', (col) => col.notNull())
    .addColumn('file_id', 'bigint')
    .addColumn('first_name', 'varchar(100)')
    .addColumn('middle_names', 'varchar(100)')
    .addColumn('last_name', 'varchar(100)')
    .addColumn('home_phone', 'varchar(100)')
    .addColumn('mobile', 'varchar(100)')
    .addColumn('email', 'varchar(255)')
    .addColumn('email2', 'varchar(255)')
    .addColumn('notes', 'varchar')
    .addColumn('json', 'jsonb')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_campaign_id', ['campaign_id'], 'campaigns', ['id'])
    .addForeignKeyConstraint('fk_createdby_id', ['createdby_id'], 'users', ['id'])
    .addForeignKeyConstraint('fk_household_id', ['household_id'], 'households', ['id'])
    .addPrimaryKeyConstraint('persons_id_tenantid', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createIndex('persons_tenant_campaign_household_index')
    .on('persons')
    .columns(['tenant_id', 'campaign_id', 'household_id'])
    .execute();

  await db.schema
    .createTable('tags')
    .addColumn('id', 'bigint', (col) => col.generatedByDefaultAsIdentity().unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('createdby_id', 'bigint', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addPrimaryKeyConstraint('tags_id_tenantid', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createTable('map_peoples_tags')
    .addColumn('id', 'bigint', (col) => col.generatedByDefaultAsIdentity().unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('person_id', 'bigint', (col) => col.notNull())
    .addColumn('tag_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_person_id', ['person_id'], 'persons', ['id'])
    .addForeignKeyConstraint('fk_tag_id', ['tag_id'], 'tags', ['id'])
    .addPrimaryKeyConstraint('map_peoples_id_tenantid', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createIndex('peoples_tag_map_tenant_person_tag_index')
    .on('map_peoples_tags')
    .columns(['tenant_id', 'person_id', 'tag_id'])
    .execute();

  await db.schema
    .createTable('map_households_tags')
    .addColumn('id', 'bigint', (col) => col.generatedByDefaultAsIdentity().unique())
    .addColumn('tenant_id', 'bigint', (col) => col.notNull())
    .addColumn('household_id', 'bigint', (col) => col.notNull())
    .addColumn('tag_id', 'bigint', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addForeignKeyConstraint('fk_tenant_id', ['tenant_id'], 'tenants', ['id'])
    .addForeignKeyConstraint('fk_households_id', ['household_id'], 'households', ['id'])
    .addForeignKeyConstraint('fk_tag_id', ['tag_id'], 'tags', ['id'])
    .addPrimaryKeyConstraint('map_households_id_tenantid', ['id', 'tenant_id'])
    .execute();

  await db.schema
    .createIndex('households_tag_map_tenant_person_tag_index')
    .on('map_households_tags')
    .columns(['tenant_id', 'household_id', 'tag_id'])
    .execute();

  await db
    .insertInto('users')
    .values({
      id: '1',
      username: 'zee',
      first_name: 'Zee',
      last_name: 'Hamid',
      mobile: '416-823-6993',
      email: 'zhamid@gmail.com',
      city: 'Milton',
    })
    .execute();

  await db
    .insertInto('tenants')
    .values({
      id: '1',
      admin_id: '1',
      createdby_id: '1',
      name: 'Zeeshan Hamid Organization',
      billing_street1: '174 Fennamore Terrace',
      billing_street2: '',
      billing_city: 'Milton',
      billing_state: 'ON',
      billing_zip: 'L9T0X8',
      billing_country: 'Canada',
    })
    .execute();

  await db.updateTable('users').set({ tenant_id: '1' }).where('id', '=', '1').execute();

  await db
    .insertInto('campaigns')
    .values({
      id: '1',
      tenant_id: '1',
      admin_id: '1',
      createdby_id: '1',
      name: 'Zeeshan Campaign',
    })
    .execute();

  await db
    .insertInto('households')
    .values({
      id: '1',
      tenant_id: '1',
      campaign_id: '1',
      createdby_id: '1',
      file_id: null,
      home_phone: '555-1234',
      street1: '123 Maple Street',
      street2: null,
      city: 'Springfield',
      state: 'SP',
      zip: '12345',
      country: 'USA',
      notes: 'This is a sample note for Household 1.',
      json: { additional_info: 'Sample JSON data' },
      created_at: '2023-11-30T12:00:00Z',
      updated_at: '2023-11-30T12:00:00Z',
    })
    .execute();

  await db
    .insertInto('households')
    .values({
      id: '2',
      tenant_id: '1',
      campaign_id: '1',
      createdby_id: '1',
      home_phone: '555-5678',
      street1: '456 Oak Avenue',
      street2: 'Apt 2',
      city: 'Greenfield',
      state: 'GF',
      zip: '67890',
      country: 'USA',
      notes: 'This is a sample note for Household 2.',
      json: { additional_info: 'More sample JSON data' },
      created_at: '2023-11-30T13:00:00Z',
      updated_at: '2023-11-30T13:00:00Z',
    })
    .execute();

  await db
    .insertInto('persons')
    .values([
      {
        tenant_id: '1',
        campaign_id: '1',
        createdby_id: '1',
        household_id: '1',
        first_name: 'Anders',
        last_name: 'Man',
        email: 'anders@email.com',
      },
      {
        tenant_id: '1',
        campaign_id: '1',
        createdby_id: '1',
        household_id: '1',
        first_name: 'Laura',
        last_name: 'Smith',
        email: 'laura.smith@email.com',
      },
      {
        tenant_id: '1',
        campaign_id: '1',
        createdby_id: '1',
        household_id: '1',
        first_name: 'Mohammed',
        last_name: 'Ali',
        email: 'mohammed.ali@email.com',
      },
      {
        tenant_id: '1',
        campaign_id: '1',
        createdby_id: '1',
        household_id: '2',
        first_name: 'Emily',
        last_name: 'Chen',
        email: 'emily.chen@email.com',
      },
      {
        tenant_id: '1',
        campaign_id: '1',
        createdby_id: '1',
        household_id: '2',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@email.com',
      },
      {
        tenant_id: '1',
        campaign_id: '1',
        createdby_id: '1',
        household_id: '2',
        first_name: 'Sara',
        last_name: 'Jones',
        email: 'sara.jones@email.com',
      },
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('====== Migrating down =======');
  await db.schema.dropTable('users').cascade().execute();
  await db.schema.dropTable('tenants').cascade().execute();
  await db.schema.dropTable('campaigns').cascade().execute();
  await db.schema.dropTable('map_campaigns_users').cascade().execute();
  await db.schema.dropTable('households').cascade().execute();
  await db.schema.dropTable('persons').cascade().execute();
  await db.schema.dropTable('tags').cascade().execute();
  await db.schema.dropTable('map_peoples_tags').cascade().execute();
  await db.schema.dropTable('map_households_tags').cascade().execute();
}
