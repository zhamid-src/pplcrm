import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS person_connections (
      id              bigserial NOT NULL,
      tenant_id       bigint NOT NULL,
      from_person_id  bigint NOT NULL,
      to_person_id    bigint NOT NULL,
      relation_type   text NOT NULL,
      custom_label    text,
      is_mutual       boolean NOT NULL DEFAULT false,
      notes           text,
      createdby_id    bigint NOT NULL,
      updatedby_id    bigint NOT NULL,
      created_at      timestamp with time zone NOT NULL DEFAULT now(),
      updated_at      timestamp with time zone NOT NULL DEFAULT now(),
      PRIMARY KEY (id, tenant_id),
      CONSTRAINT pc_no_self_loop CHECK (from_person_id <> to_person_id),
      CONSTRAINT pc_relation_type_check CHECK (
        relation_type IN (
          'referred_by', 'referred_to',
          'close_friend', 'family_member', 'spouse',
          'colleague', 'org_affiliation',
          'introduced_by', 'introduced_to',
          'custom'
        )
      ),
      CONSTRAINT pc_custom_label_required CHECK (
        relation_type <> 'custom' OR (custom_label IS NOT NULL AND custom_label <> '')
      ),
      CONSTRAINT pc_from_person_fk
        FOREIGN KEY (from_person_id, tenant_id) REFERENCES persons (id, tenant_id) ON DELETE CASCADE,
      CONSTRAINT pc_to_person_fk
        FOREIGN KEY (to_person_id, tenant_id) REFERENCES persons (id, tenant_id) ON DELETE CASCADE
    )
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS pc_unique_edge
    ON person_connections (tenant_id, from_person_id, to_person_id, relation_type)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS pc_from_idx
    ON person_connections (tenant_id, from_person_id)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS pc_to_idx
    ON person_connections (tenant_id, to_person_id)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS person_connections`.execute(db);
}
