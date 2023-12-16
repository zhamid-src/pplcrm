/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  console.log("======= Migrating up ========");

  await db.schema
    .createTable("authusers")
    .addColumn("id", "bigserial", (col) => col.primaryKey().unique())
    .addColumn("tenant_id", "bigint")
    .addColumn("verified", "boolean", (col) => col.defaultTo(false))
    .addColumn("role", "bigint")
    .addColumn("first_name", "text")
    .addColumn("middle_names", "text")
    .addColumn("last_name", "text")
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("password", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createIndex("authusers_email_index")
    .on("authusers")
    .column("email")
    .execute();

  await db.schema
    .createTable("userprofiles")
    .addColumn("uid", "bigserial", (col) => col.unique())
    .addColumn("tenant_id", "bigint")
    .addColumn("auth_id", "bigint")
    .addColumn("home_phone", "text")
    .addColumn("mobile", "text")
    .addColumn("email2", "text")
    .addColumn("street1", "text")
    .addColumn("street2", "text")
    .addColumn("city", "text")
    .addColumn("state", "text")
    .addColumn("zip", "text")
    .addColumn("country", "text")
    .addColumn("json", "jsonb")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  db.schema
    .alterTable("userprofiles")
    .addForeignKeyConstraint(
      "userprofile_uid_authusers",
      ["uid"],
      "authusers",
      ["id"],
    );

  await db.schema
    .createTable("tenants")
    .addColumn("id", "bigint", (col) => col.primaryKey().unique())
    .addColumn("admin_id", "bigint")
    .addColumn("createdby_id", "bigint")
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("mobile", "text")
    .addColumn("email", "text")
    .addColumn("email2", "text")
    .addColumn("street1", "text")
    .addColumn("street2", "text")
    .addColumn("city", "text")
    .addColumn("state", "text")
    .addColumn("zip", "text")
    .addColumn("country", "text")
    .addColumn("billing_street1", "text")
    .addColumn("billing_street2", "text")
    .addColumn("billing_city", "text")
    .addColumn("billing_state", "text")
    .addColumn("billing_zip", "text")
    .addColumn("billing_country", "text")
    .addColumn("notes", "text")
    .addColumn("json", "jsonb")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint("fk_admin_id", ["admin_id"], "userprofiles", [
      "id",
    ])
    .addForeignKeyConstraint(
      "fk_createdby_id",
      ["createdby_id"],
      "userprofiles",
      ["id"],
    )
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("id", "uuid", (col) =>
      col
        .primaryKey()
        .defaultTo(sql`gen_random_uuid()`)
        .unique(),
    )
    .addColumn("refresh_token", "uuid", (col) =>
      col.defaultTo(sql`gen_random_uuid()`).unique(),
    )
    .addColumn("user_id", "bigserial", (col) => col.notNull())
    .addColumn("tenant_id", "bigint", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("last_accessed", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("expires_at", "timestamp", (col) => col.notNull())
    .addColumn("ip_address", "text", (col) => col.notNull())
    .addColumn("user_agent", "text")
    .addColumn("status", "text", (col) => col.defaultTo("active"))
    .addColumn("other_properties", "json")
    .execute();

  await db.schema
    .createIndex("sessions_user_index")
    .on("sessions")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("sessions_refresh_token_index")
    .on("sessions")
    .column("refresh_token")
    .execute();

  await db.schema
    .createTable("roles")
    .addColumn("id", "bigserial", (col) => col.unique())
    .addColumn("name", "text", (col) => col.notNull().defaultTo("user"))
    .addColumn("description", "text")
    .addColumn("permissions", "json")
    .addColumn("tenant_id", "bigint", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addPrimaryKeyConstraint("roles_id_tenantid", ["id", "tenant_id"])
    .execute();

  await db.schema
    .createIndex("roles_tenant_index")
    .on("roles")
    .column("tenant_id")
    .execute();

  await db.schema
    .createTable("map_roles_userprofiles")
    .addColumn("id", "bigserial", (col) => col.unique())
    .addColumn("tenant_id", "bigint", (col) => col.notNull())
    .addColumn("role_id", "bigint", (col) => col.notNull())
    .addColumn("user_id", "bigint", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "fk_map_rolestenant_id",
      ["tenant_id"],
      "tenants",
      ["id"],
    )
    .addForeignKeyConstraint("fk_user_id", ["user_id"], "userprofiles", ["id"])
    .addForeignKeyConstraint("fk_role_id", ["role_id"], "roles", ["id"])
    .addPrimaryKeyConstraint("map_roles_id_tenantid", ["id", "tenant_id"])
    .execute();

  await db.schema
    .createTable("campaigns")
    .addColumn("id", "bigserial", (col) => col.unique())
    .addColumn("tenant_id", "bigint", (col) => col.notNull())
    .addColumn("admin_id", "bigint", (col) => col.notNull())
    .addColumn("createdby_id", "bigint", (col) => col.notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("notes", "text")
    .addColumn("json", "jsonb")
    .addColumn("startdate", "time")
    .addColumn("enddate", "time")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "fk_campaigns_tenant_id",
      ["tenant_id"],
      "tenants",
      ["id"],
    )
    .addForeignKeyConstraint("fk_admin_id", ["admin_id"], "userprofiles", [
      "id",
    ])
    .addForeignKeyConstraint(
      "fk_createdby_id",
      ["createdby_id"],
      "userprofiles",
      ["id"],
    )
    .addPrimaryKeyConstraint("campaigns_id_tenantid", ["id", "tenant_id"])
    .execute();

  await db.schema
    .createIndex("campaigns_tenant_index")
    .on("campaigns")
    .column("tenant_id")
    .execute();

  await db.schema
    .createTable("map_campaigns_userprofiles")
    .addColumn("id", "bigserial", (col) => col.unique())
    .addColumn("tenant_id", "bigint", (col) => col.notNull())
    .addColumn("campaign_id", "bigint", (col) => col.notNull())
    .addColumn("user_id", "bigint", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "fk_map_campaigns_tenant_id",
      ["tenant_id"],
      "tenants",
      ["id"],
    )
    .addForeignKeyConstraint("fk_user_id", ["user_id"], "userprofiles", ["id"])
    .addForeignKeyConstraint("fk_campaign_id", ["campaign_id"], "campaigns", [
      "id",
    ])
    .addPrimaryKeyConstraint("map_campaigns_id_tenantid", ["id", "tenant_id"])
    .execute();

  await db.schema
    .createIndex("campaigns_map_tenant_user_index")
    .on("map_campaigns_userprofiles")
    .columns(["tenant_id", "user_id"])
    .execute();

  await db.schema
    .createIndex("campaigns_map_tenant_campaign_index")
    .on("map_campaigns_userprofiles")
    .columns(["tenant_id", "campaign_id"])
    .execute();

  await db.schema
    .createTable("households")
    .addColumn("id", "bigserial", (col) => col.unique())
    .addColumn("tenant_id", "bigint", (col) => col.notNull())
    .addColumn("campaign_id", "bigint", (col) => col.notNull())
    .addColumn("createdby_id", "bigint", (col) => col.notNull())
    .addColumn("file_id", "bigint")
    .addColumn("home_phone", "text")
    .addColumn("street1", "text")
    .addColumn("street2", "text")
    .addColumn("city", "text")
    .addColumn("state", "text")
    .addColumn("zip", "text")
    .addColumn("country", "text")
    .addColumn("notes", "text")
    .addColumn("json", "jsonb")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "fk_househods_tenant_id",
      ["tenant_id"],
      "tenants",
      ["id"],
    )
    .addForeignKeyConstraint("fk_campaign_id", ["campaign_id"], "campaigns", [
      "id",
    ])
    .addForeignKeyConstraint(
      "fk_createdby_id",
      ["createdby_id"],
      "userprofiles",
      ["id"],
    )
    .addPrimaryKeyConstraint("households_id_tenantid", ["id", "tenant_id"])
    .execute();

  await db.schema
    .createTable("persons")
    .addColumn("id", "bigserial", (col) => col.unique())
    .addColumn("tenant_id", "bigint", (col) => col.notNull())
    .addColumn("campaign_id", "bigint", (col) => col.notNull())
    .addColumn("createdby_id", "bigint", (col) => col.notNull())
    .addColumn("household_id", "bigint", (col) => col.notNull())
    .addColumn("file_id", "bigint")
    .addColumn("first_name", "text")
    .addColumn("middle_names", "text")
    .addColumn("last_name", "text")
    .addColumn("home_phone", "text")
    .addColumn("mobile", "text")
    .addColumn("email", "text")
    .addColumn("email2", "text")
    .addColumn("notes", "text")
    .addColumn("json", "jsonb")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint("fk_persons_tenant_id", ["tenant_id"], "tenants", [
      "id",
    ])
    .addForeignKeyConstraint("fk_campaign_id", ["campaign_id"], "campaigns", [
      "id",
    ])
    .addForeignKeyConstraint(
      "fk_createdby_id",
      ["createdby_id"],
      "userprofiles",
      ["id"],
    )
    .addForeignKeyConstraint(
      "fk_household_id",
      ["household_id"],
      "households",
      ["id"],
    )
    .addPrimaryKeyConstraint("persons_id_tenantid", ["id", "tenant_id"])
    .execute();

  await db.schema
    .createIndex("persons_tenant_campaign_household_index")
    .on("persons")
    .columns(["tenant_id", "campaign_id", "household_id"])
    .execute();

  await db.schema
    .createTable("tags")
    .addColumn("id", "bigserial", (col) => col.unique())
    .addColumn("tenant_id", "bigint", (col) => col.notNull())
    .addColumn("createdby_id", "bigint", (col) => col.notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint("fk_tags_tenant_id", ["tenant_id"], "tenants", [
      "id",
    ])
    .addPrimaryKeyConstraint("tags_id_tenantid", ["id", "tenant_id"])
    .execute();

  await db.schema
    .createTable("map_peoples_tags")
    .addColumn("id", "bigserial", (col) => col.unique())
    .addColumn("tenant_id", "bigint", (col) => col.notNull())
    .addColumn("person_id", "bigint", (col) => col.notNull())
    .addColumn("tag_id", "bigint", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "fk_map_peoples_tenant_id",
      ["tenant_id"],
      "tenants",
      ["id"],
    )
    .addForeignKeyConstraint("fk_person_id", ["person_id"], "persons", ["id"])
    .addForeignKeyConstraint("fk_tag_id", ["tag_id"], "tags", ["id"])
    .addPrimaryKeyConstraint("map_peoples_id_tenantid", ["id", "tenant_id"])
    .execute();

  await db.schema
    .createIndex("peoples_tag_map_tenant_person_tag_index")
    .on("map_peoples_tags")
    .columns(["tenant_id", "person_id", "tag_id"])
    .execute();

  await db.schema
    .createTable("map_households_tags")
    .addColumn("id", "bigserial", (col) => col.unique())
    .addColumn("tenant_id", "bigint", (col) => col.notNull())
    .addColumn("household_id", "bigint", (col) => col.notNull())
    .addColumn("tag_id", "bigint", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "fk_map_household_tags_tenant_id",
      ["tenant_id"],
      "tenants",
      ["id"],
    )
    .addForeignKeyConstraint(
      "fk_households_id",
      ["household_id"],
      "households",
      ["id"],
    )
    .addForeignKeyConstraint("fk_tag_id", ["tag_id"], "tags", ["id"])
    .addPrimaryKeyConstraint("map_households_id_tenantid", ["id", "tenant_id"])
    .execute();

  await db.schema
    .createIndex("households_tag_map_tenant_person_tag_index")
    .on("map_households_tags")
    .columns(["tenant_id", "household_id", "tag_id"])
    .execute();

  // First, create an authenticated user
  await db
    .insertInto("authusers")
    .values({
      id: 1,
      first_name: "Zee",
      last_name: "Hamid",
      email: "zhamid@gmail.com",
      password: "$2b$10$t5uTrvGiUwK4SoHOjG3aiOtwDDwGHh0C7uf/80R7tdNBrQtPG0b.K",
    })
    .execute();

  // Now, create a profile for this user
  await db
    .insertInto("userprofiles")
    .values({
      id: 1,
      mobile: "416-823-6993",
      city: "Milton",
    })
    .execute();

  //Make sure we have a tenant, with the previously created
  // user as the admin and createdby
  await db
    .insertInto("tenants")
    .values({
      id: 1,
      admin_id: 1,
      createdby_id: 1,
      name: "Zeeshan Hamid Organization",
      billing_street1: "174 Fennamore Terrace",
      billing_street2: "",
      billing_city: "Milton",
      billing_state: "ON",
      billing_zip: "L9T0X8",
      billing_country: "Canada",
    })
    .execute();

  // Update the profile with the tenant and auth id
  await db
    .updateTable("userprofiles")
    .set({ tenant_id: 1, auth_id: 1 })
    .where("id", "=", 1)
    .execute();

  // Update the auth user with the tenant id
  await db
    .updateTable("authusers")
    .set({ tenant_id: 1 })
    .where("id", "=", 1)
    .execute();

  // Now start a campaign
  await db
    .insertInto("campaigns")
    .values({
      id: 1,
      tenant_id: 1,
      admin_id: 1,
      createdby_id: 1,
      name: "Zeeshan Campaign",
    })
    .execute();

  await db
    .insertInto("households")
    .values({
      id: 1,
      tenant_id: 1,
      campaign_id: 1,
      createdby_id: 1,
      home_phone: "555-1234",
      street1: "123 Maple Street",
      city: "Springfield",
      state: "SP",
      zip: "12345",
      country: "USA",
      notes: "This is a sample note for Household 1.",
      json: { additional_info: "Sample JSON data" },
      created_at: "2023-11-30T12:00:00Z",
      updated_at: "2023-11-30T12:00:00Z",
    })
    .execute();

  await db
    .insertInto("households")
    .values({
      id: 2,
      tenant_id: 1,
      campaign_id: 1,
      createdby_id: 1,
      home_phone: "555-5678",
      street1: "456 Oak Avenue",
      street2: "Apt 2",
      city: "Greenfield",
      state: "GF",
      zip: "67890",
      country: "USA",
      notes: "This is a sample note for Household 2.",
      json: { additional_info: "More sample JSON data" },
      created_at: "2023-11-30T13:00:00Z",
      updated_at: "2023-11-30T13:00:00Z",
    })
    .execute();

  await db
    .insertInto("persons")
    .values([
      {
        tenant_id: 1,
        campaign_id: 1,
        createdby_id: 1,
        household_id: 1,
        first_name: "Anders",
        last_name: "Man",
        email: "anders@email.com",
      },
      {
        tenant_id: 1,
        campaign_id: 1,
        createdby_id: 1,
        household_id: 1,
        first_name: "Laura",
        last_name: "Smith",
        email: "laura.smith@email.com",
      },
      {
        tenant_id: 1,
        campaign_id: 1,
        createdby_id: 1,
        household_id: 1,
        first_name: "Mohammed",
        last_name: "Ali",
        email: "mohammed.ali@email.com",
      },
      {
        tenant_id: 1,
        campaign_id: 1,
        createdby_id: 1,
        household_id: 2,
        first_name: "Emily",
        last_name: "Chen",
        email: "emily.chen@email.com",
      },
      {
        tenant_id: 1,
        campaign_id: 1,
        createdby_id: 1,
        household_id: 2,
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@email.com",
      },
      {
        tenant_id: 1,
        campaign_id: 1,
        createdby_id: 1,
        household_id: 2,
        first_name: "Sara",
        last_name: "Jones",
        email: "sara.jones@email.com",
      },
    ])
    .execute();

  await db.schema
    .alterTable("userprofiles")
    .addForeignKeyConstraint(
      "fk_userprofiles_tenant_id",
      ["tenant_id"],
      "tenants",
      ["id"],
    )
    .execute();

  await db.schema
    .alterTable("userprofiles")
    .addForeignKeyConstraint(
      "fk_userprofiles_auth_id",
      ["auth_id"],
      "authusers",
      ["id"],
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log("====== Migrating down =======");
  await db.schema.dropTable("userprofiles").cascade().execute();
  await db.schema.dropTable("tenants").cascade().execute();
  await db.schema.dropTable("sessions").cascade().execute();
  await db.schema.dropTable("authusers").cascade().execute();
  await db.schema.dropTable("roles").cascade().execute();
  await db.schema.dropTable("map_roles_userprofiles").cascade().execute();
  await db.schema.dropTable("campaigns").cascade().execute();
  await db.schema.dropTable("map_campaigns_userprofiles").cascade().execute();
  await db.schema.dropTable("households").cascade().execute();
  await db.schema.dropTable("persons").cascade().execute();
  await db.schema.dropTable("tags").cascade().execute();
  await db.schema.dropTable("map_peoples_tags").cascade().execute();
  await db.schema.dropTable("map_households_tags").cascade().execute();
}
