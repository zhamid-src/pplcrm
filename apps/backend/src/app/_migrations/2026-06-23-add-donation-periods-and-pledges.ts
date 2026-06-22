import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Donation periods: configurable campaign limit windows (replaces hardcoded calendar year)
  await sql`
    CREATE TABLE IF NOT EXISTS donation_periods (
      id          bigserial NOT NULL,
      tenant_id   bigint NOT NULL,
      name        text NOT NULL,
      start_date  date NOT NULL,
      end_date    date,
      limit_amount integer NOT NULL,
      is_active   boolean DEFAULT true NOT NULL,
      created_at  timestamp with time zone DEFAULT now() NOT NULL,
      updated_at  timestamp with time zone DEFAULT now() NOT NULL,
      createdby_id bigint NOT NULL,
      updatedby_id bigint NOT NULL,
      PRIMARY KEY (id, tenant_id),
      CONSTRAINT donation_periods_limit_check CHECK (limit_amount > 0),
      CONSTRAINT donation_periods_dates_check CHECK (end_date IS NULL OR end_date > start_date)
    )
  `.execute(db);

  // Donation pledges: Stripe subscriptions for recurring monthly donations
  await sql`
    CREATE TABLE IF NOT EXISTS donation_pledges (
      id                    bigserial NOT NULL,
      tenant_id             bigint NOT NULL,
      person_id             bigint,
      stripe_subscription_id text UNIQUE,
      stripe_customer_id    text,
      monthly_amount        integer NOT NULL,
      status                text DEFAULT 'active' NOT NULL,
      started_at            timestamp with time zone DEFAULT now() NOT NULL,
      cancelled_at          timestamp with time zone,
      next_billing_date     date,
      first_name            text,
      last_name             text,
      email                 text,
      state                 text,
      country               text,
      created_at            timestamp with time zone DEFAULT now() NOT NULL,
      updated_at            timestamp with time zone DEFAULT now() NOT NULL,
      createdby_id          bigint NOT NULL,
      updatedby_id          bigint NOT NULL,
      PRIMARY KEY (id, tenant_id),
      CONSTRAINT donation_pledges_status_check CHECK (status IN ('active', 'past_due', 'cancelled', 'unpaid'))
    )
  `.execute(db);

  // Link individual donation installments back to their pledge
  await sql`ALTER TABLE donations ADD COLUMN IF NOT EXISTS pledge_id bigint`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE donations DROP COLUMN IF EXISTS pledge_id`.execute(db);
  await sql`DROP TABLE IF EXISTS donation_pledges`.execute(db);
  await sql`DROP TABLE IF EXISTS donation_periods`.execute(db);
}
