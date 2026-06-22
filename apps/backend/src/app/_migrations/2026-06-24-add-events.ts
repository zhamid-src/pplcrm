import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // General-purpose events: fundraising dinners, town halls, meet-and-greets, etc.
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id                            bigserial NOT NULL,
      tenant_id                     bigint NOT NULL,
      name                          text NOT NULL,
      description                   text,
      location_address              text,
      start_time                    timestamp with time zone NOT NULL,
      end_time                      timestamp with time zone NOT NULL,
      capacity                      integer,
      contact_email                 text,
      contact_phone                 text,
      slug                          text NOT NULL,
      is_published                  boolean DEFAULT false NOT NULL,
      send_reminder                 boolean DEFAULT true NOT NULL,
      send_registration_confirmation boolean DEFAULT true NOT NULL,
      created_at                    timestamp with time zone DEFAULT now() NOT NULL,
      updated_at                    timestamp with time zone DEFAULT now() NOT NULL,
      createdby_id                  bigint NOT NULL,
      updatedby_id                  bigint NOT NULL,
      search_vector                 tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(location_address, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C')
      ) STORED,
      PRIMARY KEY (id, tenant_id),
      CONSTRAINT events_end_after_start_check CHECK (end_time > start_time),
      CONSTRAINT events_capacity_check CHECK (capacity IS NULL OR capacity > 0)
    )
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS events_tenant_slug_unique
    ON events (tenant_id, slug)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS events_search_vector_idx
    ON events USING gin(search_vector)
  `.execute(db);

  // Ticket types per event (free, paid, VIP, etc.)
  await sql`
    CREATE TABLE IF NOT EXISTS event_ticket_types (
      id           bigserial NOT NULL,
      tenant_id    bigint NOT NULL,
      event_id     bigint NOT NULL,
      name         text NOT NULL,
      description  text,
      price_cents  integer DEFAULT 0 NOT NULL,
      capacity     integer,
      sort_order   integer DEFAULT 0 NOT NULL,
      created_at   timestamp with time zone DEFAULT now() NOT NULL,
      updated_at   timestamp with time zone DEFAULT now() NOT NULL,
      createdby_id bigint NOT NULL,
      updatedby_id bigint NOT NULL,
      PRIMARY KEY (id, tenant_id),
      CONSTRAINT event_ticket_types_price_check CHECK (price_cents >= 0),
      CONSTRAINT event_ticket_types_capacity_check CHECK (capacity IS NULL OR capacity > 0)
    )
  `.execute(db);

  // Attendee registrations: one row per person per event
  await sql`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id             bigserial NOT NULL,
      tenant_id      bigint NOT NULL,
      event_id       bigint NOT NULL,
      person_id      bigint NOT NULL,
      ticket_type_id bigint,
      status         text DEFAULT 'registered' NOT NULL,
      checked_in_at  timestamp with time zone,
      notes          text,
      created_at     timestamp with time zone DEFAULT now() NOT NULL,
      updated_at     timestamp with time zone DEFAULT now() NOT NULL,
      createdby_id   bigint NOT NULL,
      updatedby_id   bigint NOT NULL,
      PRIMARY KEY (id, tenant_id),
      CONSTRAINT event_registrations_status_check CHECK (
        status IN ('registered', 'attended', 'no_show', 'cancelled')
      ),
      CONSTRAINT event_registrations_unique UNIQUE (tenant_id, event_id, person_id)
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS event_registrations_event_idx
    ON event_registrations (tenant_id, event_id)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS event_registrations_person_idx
    ON event_registrations (tenant_id, person_id)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS event_registrations`.execute(db);
  await sql`DROP TABLE IF EXISTS event_ticket_types`.execute(db);
  await sql`DROP TABLE IF EXISTS events`.execute(db);
}
