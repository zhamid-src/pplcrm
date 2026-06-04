import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: db-optimizations ========');

  // 1. Alter sessions.other_properties from json to jsonb
  await sql`ALTER TABLE sessions ALTER COLUMN other_properties TYPE jsonb USING other_properties::jsonb;`.execute(db);

  // 2. Add status CHECK constraints
  await sql`ALTER TABLE tasks ADD CONSTRAINT chk_tasks_status CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'canceled', 'archived'));`.execute(db);
  await sql`ALTER TABLE lists ADD CONSTRAINT chk_lists_status CHECK (status IN ('idle', 'refreshing', 'failed'));`.execute(db);
  await sql`ALTER TABLE volunteer_shifts ADD CONSTRAINT chk_volunteer_shifts_status CHECK (status IN ('signed_up', 'attended', 'no_show', 'cancelled'));`.execute(db);
  await sql`ALTER TABLE web_forms ADD CONSTRAINT chk_web_forms_status CHECK (status IN ('active', 'archived'));`.execute(db);
  await sql`ALTER TABLE background_jobs ADD CONSTRAINT chk_background_jobs_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'));`.execute(db);

  // 3. Recreate idx_teams_captain as composite (tenant_id, team_captain_id)
  await sql`DROP INDEX IF EXISTS idx_teams_captain;`.execute(db);
  await sql`CREATE INDEX idx_teams_tenant_captain ON teams (tenant_id, team_captain_id);`.execute(db);

  // 4. Optimize Junction Tables (Remove surrogate key id and use composite PK)

  // map_campaigns_users
  await sql`ALTER TABLE map_campaigns_users DROP CONSTRAINT IF EXISTS map_campaigns_id_tenantid;`.execute(db);
  await sql`ALTER TABLE map_campaigns_users DROP COLUMN IF EXISTS id;`.execute(db);
  await sql`ALTER TABLE map_campaigns_users ADD CONSTRAINT map_campaigns_users_pk PRIMARY KEY (tenant_id, campaign_id, user_id);`.execute(db);

  // map_households_tags
  await sql`ALTER TABLE map_households_tags DROP CONSTRAINT IF EXISTS map_households_id_tenantid;`.execute(db);
  await sql`ALTER TABLE map_households_tags DROP COLUMN IF EXISTS id;`.execute(db);
  await sql`ALTER TABLE map_households_tags ADD CONSTRAINT map_households_tags_pk PRIMARY KEY (tenant_id, household_id, tag_id);`.execute(db);

  // map_peoples_tags
  await sql`ALTER TABLE map_peoples_tags DROP CONSTRAINT IF EXISTS map_peoples_id_tenantid;`.execute(db);
  await sql`ALTER TABLE map_peoples_tags DROP CONSTRAINT IF EXISTS unique_person_tag_per_tenant;`.execute(db);
  await sql`ALTER TABLE map_peoples_tags DROP COLUMN IF EXISTS id;`.execute(db);
  await sql`ALTER TABLE map_peoples_tags ADD CONSTRAINT map_peoples_tags_pk PRIMARY KEY (tenant_id, person_id, tag_id);`.execute(db);

  // map_teams_persons
  await sql`ALTER TABLE map_teams_persons DROP CONSTRAINT IF EXISTS map_teams_persons_pk;`.execute(db);
  await sql`ALTER TABLE map_teams_persons DROP CONSTRAINT IF EXISTS uq_map_teams_persons_team_person;`.execute(db);
  await sql`ALTER TABLE map_teams_persons DROP COLUMN IF EXISTS id;`.execute(db);
  await sql`ALTER TABLE map_teams_persons ADD CONSTRAINT map_teams_persons_pk PRIMARY KEY (tenant_id, team_id, person_id);`.execute(db);

  // map_teams_lists
  await sql`ALTER TABLE map_teams_lists DROP CONSTRAINT IF EXISTS map_teams_lists_pk;`.execute(db);
  await sql`ALTER TABLE map_teams_lists DROP CONSTRAINT IF EXISTS uq_map_teams_lists_team_list;`.execute(db);
  await sql`ALTER TABLE map_teams_lists DROP COLUMN IF EXISTS id;`.execute(db);
  await sql`ALTER TABLE map_teams_lists ADD CONSTRAINT map_teams_lists_pk PRIMARY KEY (tenant_id, team_id, list_id);`.execute(db);

  // map_lists_persons
  await sql`ALTER TABLE map_lists_persons DROP CONSTRAINT IF EXISTS map_lists_persons_id_tenantid;`.execute(db);
  await sql`ALTER TABLE map_lists_persons DROP CONSTRAINT IF EXISTS unique_list_person_per_tenant;`.execute(db);
  await sql`ALTER TABLE map_lists_persons DROP COLUMN IF EXISTS id;`.execute(db);
  await sql`ALTER TABLE map_lists_persons ADD CONSTRAINT map_lists_persons_pk PRIMARY KEY (tenant_id, list_id, person_id);`.execute(db);

  // map_lists_households
  await sql`ALTER TABLE map_lists_households DROP CONSTRAINT IF EXISTS map_lists_households_id_tenantid;`.execute(db);
  await sql`ALTER TABLE map_lists_households DROP CONSTRAINT IF EXISTS unique_list_household_per_tenant;`.execute(db);
  await sql`ALTER TABLE map_lists_households DROP COLUMN IF EXISTS id;`.execute(db);
  await sql`ALTER TABLE map_lists_households ADD CONSTRAINT map_lists_households_pk PRIMARY KEY (tenant_id, list_id, household_id);`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: db-optimizations ========');

  // 1. Revert sessions.other_properties from jsonb to json
  await sql`ALTER TABLE sessions ALTER COLUMN other_properties TYPE json USING other_properties::json;`.execute(db);

  // 2. Revert CHECK constraints
  await sql`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_tasks_status;`.execute(db);
  await sql`ALTER TABLE lists DROP CONSTRAINT IF EXISTS chk_lists_status;`.execute(db);
  await sql`ALTER TABLE volunteer_shifts DROP CONSTRAINT IF EXISTS chk_volunteer_shifts_status;`.execute(db);
  await sql`ALTER TABLE web_forms DROP CONSTRAINT IF EXISTS chk_web_forms_status;`.execute(db);
  await sql`ALTER TABLE background_jobs DROP CONSTRAINT IF EXISTS chk_background_jobs_status;`.execute(db);

  // 3. Revert teams captain index
  await sql`DROP INDEX IF EXISTS idx_teams_tenant_captain;`.execute(db);
  await sql`CREATE INDEX idx_teams_captain ON teams (team_captain_id);`.execute(db);

  // 4. Revert Junction Tables (Add surrogate key id back and recreate original PKs/constraints)

  // map_campaigns_users
  await sql`ALTER TABLE map_campaigns_users DROP CONSTRAINT IF EXISTS map_campaigns_users_pk;`.execute(db);
  await sql`ALTER TABLE map_campaigns_users ADD COLUMN id bigserial UNIQUE;`.execute(db);
  await sql`ALTER TABLE map_campaigns_users ADD CONSTRAINT map_campaigns_id_tenantid PRIMARY KEY (id, tenant_id);`.execute(db);

  // map_households_tags
  await sql`ALTER TABLE map_households_tags DROP CONSTRAINT IF EXISTS map_households_tags_pk;`.execute(db);
  await sql`ALTER TABLE map_households_tags ADD COLUMN id bigserial UNIQUE;`.execute(db);
  await sql`ALTER TABLE map_households_tags ADD CONSTRAINT map_households_id_tenantid PRIMARY KEY (id, tenant_id);`.execute(db);

  // map_peoples_tags
  await sql`ALTER TABLE map_peoples_tags DROP CONSTRAINT IF EXISTS map_peoples_tags_pk;`.execute(db);
  await sql`ALTER TABLE map_peoples_tags ADD COLUMN id bigserial UNIQUE;`.execute(db);
  await sql`ALTER TABLE map_peoples_tags ADD CONSTRAINT map_peoples_id_tenantid PRIMARY KEY (id, tenant_id);`.execute(db);
  await sql`ALTER TABLE map_peoples_tags ADD CONSTRAINT unique_person_tag_per_tenant UNIQUE (tenant_id, person_id, tag_id);`.execute(db);

  // map_teams_persons
  await sql`ALTER TABLE map_teams_persons DROP CONSTRAINT IF EXISTS map_teams_persons_pk;`.execute(db);
  await sql`ALTER TABLE map_teams_persons ADD COLUMN id bigserial UNIQUE;`.execute(db);
  await sql`ALTER TABLE map_teams_persons ADD CONSTRAINT map_teams_persons_pk PRIMARY KEY (id, tenant_id);`.execute(db);
  await sql`ALTER TABLE map_teams_persons ADD CONSTRAINT uq_map_teams_persons_team_person UNIQUE (tenant_id, team_id, person_id);`.execute(db);

  // map_teams_lists
  await sql`ALTER TABLE map_teams_lists DROP CONSTRAINT IF EXISTS map_teams_lists_pk;`.execute(db);
  await sql`ALTER TABLE map_teams_lists ADD COLUMN id bigserial UNIQUE;`.execute(db);
  await sql`ALTER TABLE map_teams_lists ADD CONSTRAINT map_teams_lists_pk PRIMARY KEY (id, tenant_id);`.execute(db);
  await sql`ALTER TABLE map_teams_lists ADD CONSTRAINT uq_map_teams_lists_team_list UNIQUE (tenant_id, team_id, list_id);`.execute(db);

  // map_lists_persons
  await sql`ALTER TABLE map_lists_persons DROP CONSTRAINT IF EXISTS map_lists_persons_pk;`.execute(db);
  await sql`ALTER TABLE map_lists_persons ADD COLUMN id bigserial UNIQUE;`.execute(db);
  await sql`ALTER TABLE map_lists_persons ADD CONSTRAINT map_lists_persons_id_tenantid PRIMARY KEY (id, tenant_id);`.execute(db);
  await sql`ALTER TABLE map_lists_persons ADD CONSTRAINT unique_list_person_per_tenant UNIQUE (tenant_id, list_id, person_id);`.execute(db);

  // map_lists_households
  await sql`ALTER TABLE map_lists_households DROP CONSTRAINT IF EXISTS map_lists_households_pk;`.execute(db);
  await sql`ALTER TABLE map_lists_households ADD COLUMN id bigserial UNIQUE;`.execute(db);
  await sql`ALTER TABLE map_lists_households ADD CONSTRAINT map_lists_households_id_tenantid PRIMARY KEY (id, tenant_id);`.execute(db);
  await sql`ALTER TABLE map_lists_households ADD CONSTRAINT unique_list_household_per_tenant UNIQUE (tenant_id, list_id, household_id);`.execute(db);
}
