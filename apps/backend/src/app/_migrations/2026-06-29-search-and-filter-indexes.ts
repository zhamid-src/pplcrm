/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating up: search-and-filter-indexes ========');

  // ──────────────────────────────────────────────────────────────────────────
  // 0. Prerequisites
  // ──────────────────────────────────────────────────────────────────────────
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`.execute(db);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PERSONS
  // ──────────────────────────────────────────────────────────────────────────

  // 1a. FTS – stored generated tsvector column
  //   Weight A : first_name, last_name      (primary identity)
  //   Weight B : email, email2, mobile      (contact channels)
  //   Weight C : home_phone
  await sql`
    ALTER TABLE persons
    ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(first_name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(last_name,  '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(email,      '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(email2,     '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(mobile,     '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(home_phone, '')), 'C')
      ) STORED;
  `.execute(db);

  // GIN on tsvector only — bigint has no GIN operator class
  await sql`CREATE INDEX IF NOT EXISTS idx_persons_fts ON persons USING GIN (search_vector);`.execute(db);

  // 1b. Trigram GIN – single text column, no tenant_id
  await sql`CREATE INDEX IF NOT EXISTS idx_persons_trgm_first_name ON persons USING GIN (first_name gin_trgm_ops);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_persons_trgm_last_name  ON persons USING GIN (last_name  gin_trgm_ops);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_persons_trgm_email      ON persons USING GIN (email      gin_trgm_ops);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_persons_trgm_mobile     ON persons USING GIN (mobile     gin_trgm_ops);`.execute(
    db,
  );

  // 1c. B-Tree – composite with tenant_id for FK / NULL / categorical filters
  await sql`CREATE INDEX IF NOT EXISTS idx_persons_tenant_assigned    ON persons (tenant_id, assigned_to);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_persons_tenant_company     ON persons (tenant_id, company_id);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_persons_tenant_email_btree ON persons (tenant_id, email);`.execute(db);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. HOUSEHOLDS
  // ──────────────────────────────────────────────────────────────────────────

  // 2a. FTS – stored generated tsvector column
  //   Weight A : street1, city, address_fp_full
  //   Weight B : zip, state, home_phone
  //   Weight C : street_num, apt, street2, country
  await sql`
    ALTER TABLE households
    ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(street1,         '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(city,            '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(address_fp_full, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(zip,             '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(state,           '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(home_phone,      '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(street_num,      '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(apt,             '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(street2,         '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(country,         '')), 'C')
      ) STORED;
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_households_fts ON households USING GIN (search_vector);`.execute(db);

  // 2b. Trigram GIN – single text columns
  await sql`CREATE INDEX IF NOT EXISTS idx_households_trgm_street1 ON households USING GIN (street1 gin_trgm_ops);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_households_trgm_city    ON households USING GIN (city    gin_trgm_ops);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_households_trgm_zip     ON households USING GIN (zip     gin_trgm_ops);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_households_trgm_state   ON households USING GIN (state   gin_trgm_ops);`.execute(
    db,
  );

  // 2c. B-Tree – composite tenant_id indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_households_tenant_type           ON households (tenant_id, type);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_households_tenant_geocoding       ON households (tenant_id, geocoding_status);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_households_tenant_is_placeholder ON households (tenant_id, is_placeholder);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_households_tenant_campaign        ON households (tenant_id, campaign_id);`.execute(
    db,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 3. COMPANIES
  // ──────────────────────────────────────────────────────────────────────────

  // 3a. FTS
  //   Weight A : name
  //   Weight B : email, website, phone
  //   Weight C : industry
  await sql`
    ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name,     '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(email,    '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(website,  '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(phone,    '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(industry, '')), 'C')
      ) STORED;
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_companies_fts ON companies USING GIN (search_vector);`.execute(db);

  // 3b. Trigram GIN
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_trgm_name     ON companies USING GIN (name     gin_trgm_ops);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_trgm_email    ON companies USING GIN (email    gin_trgm_ops);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_trgm_industry ON companies USING GIN (industry gin_trgm_ops);`.execute(
    db,
  );

  // 3c. B-Tree
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_tenant_email    ON companies (tenant_id, email);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_tenant_industry ON companies (tenant_id, industry);`.execute(db);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. VOLUNTEER_EVENTS
  // ──────────────────────────────────────────────────────────────────────────

  // 4a. FTS
  //   Weight A : name
  //   Weight B : location_address, contact_email
  //   Weight C : description
  await sql`
    ALTER TABLE volunteer_events
    ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name,             '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(location_address, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(contact_email,    '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(description,      '')), 'C')
      ) STORED;
  `.execute(db);

  await sql`CREATE INDEX IF NOT EXISTS idx_volunteer_events_fts ON volunteer_events USING GIN (search_vector);`.execute(
    db,
  );

  // 4b. Trigram GIN
  await sql`CREATE INDEX IF NOT EXISTS idx_volunteer_events_trgm_name     ON volunteer_events USING GIN (name             gin_trgm_ops);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_volunteer_events_trgm_location ON volunteer_events USING GIN (location_address gin_trgm_ops);`.execute(
    db,
  );

  // 4c. B-Tree – date range filters common on the scheduling grid
  await sql`CREATE INDEX IF NOT EXISTS idx_volunteer_events_tenant_start ON volunteer_events (tenant_id, start_time);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_volunteer_events_tenant_end   ON volunteer_events (tenant_id, end_time);`.execute(
    db,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 5. LISTS
  // ──────────────────────────────────────────────────────────────────────────

  // 5a. Trigram GIN
  await sql`CREATE INDEX IF NOT EXISTS idx_lists_trgm_name        ON lists USING GIN (name        gin_trgm_ops);`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_lists_trgm_description ON lists USING GIN (description gin_trgm_ops);`.execute(
    db,
  );

  // 5b. B-Tree
  await sql`CREATE INDEX IF NOT EXISTS idx_lists_tenant_object     ON lists (tenant_id, object);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_lists_tenant_is_dynamic ON lists (tenant_id, is_dynamic);`.execute(db);
  await sql`CREATE INDEX IF NOT EXISTS idx_lists_tenant_status     ON lists (tenant_id, status);`.execute(db);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. TAGS
  // ──────────────────────────────────────────────────────────────────────────

  // 6a. Trigram GIN
  await sql`CREATE INDEX IF NOT EXISTS idx_tags_trgm_name ON tags USING GIN (name gin_trgm_ops);`.execute(db);

  // 6b. B-Tree
  await sql`CREATE INDEX IF NOT EXISTS idx_tags_tenant_type ON tags (tenant_id, type);`.execute(db);

  console.log('======= Done: search-and-filter-indexes ========');
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('======= Migrating down: search-and-filter-indexes ========');

  // ── Tags ──
  await sql`DROP INDEX IF EXISTS idx_tags_tenant_type;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_tags_trgm_name;`.execute(db);

  // ── Lists ──
  await sql`DROP INDEX IF EXISTS idx_lists_tenant_status;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_lists_tenant_is_dynamic;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_lists_tenant_object;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_lists_trgm_description;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_lists_trgm_name;`.execute(db);

  // ── Volunteer Events ──
  await sql`DROP INDEX IF EXISTS idx_volunteer_events_tenant_end;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_volunteer_events_tenant_start;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_volunteer_events_trgm_location;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_volunteer_events_trgm_name;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_volunteer_events_fts;`.execute(db);
  await sql`ALTER TABLE volunteer_events DROP COLUMN IF EXISTS search_vector;`.execute(db);

  // ── Companies ──
  await sql`DROP INDEX IF EXISTS idx_companies_tenant_industry;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_companies_tenant_email;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_companies_trgm_industry;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_companies_trgm_email;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_companies_trgm_name;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_companies_fts;`.execute(db);
  await sql`ALTER TABLE companies DROP COLUMN IF EXISTS search_vector;`.execute(db);

  // ── Households ──
  await sql`DROP INDEX IF EXISTS idx_households_tenant_campaign;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_households_tenant_is_placeholder;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_households_tenant_geocoding;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_households_tenant_type;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_households_trgm_state;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_households_trgm_zip;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_households_trgm_city;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_households_trgm_street1;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_households_fts;`.execute(db);
  await sql`ALTER TABLE households DROP COLUMN IF EXISTS search_vector;`.execute(db);

  // ── Persons ──
  await sql`DROP INDEX IF EXISTS idx_persons_tenant_email_btree;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_persons_tenant_company;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_persons_tenant_assigned;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_persons_trgm_mobile;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_persons_trgm_email;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_persons_trgm_last_name;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_persons_trgm_first_name;`.execute(db);
  await sql`DROP INDEX IF EXISTS idx_persons_fts;`.execute(db);
  await sql`ALTER TABLE persons DROP COLUMN IF EXISTS search_vector;`.execute(db);
}
