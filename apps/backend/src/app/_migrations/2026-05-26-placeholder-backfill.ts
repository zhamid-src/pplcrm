import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  const tenants = await db.selectFrom('tenants').select(['id', 'placeholder_household_id']).execute();

  for (const tenant of tenants) {
    if (tenant.placeholder_household_id) continue;

    // Find the current admin_id / createdby_id from authusers
    const adminUser = await db
      .selectFrom('authusers')
      .select('id')
      .where('tenant_id', '=', tenant.id)
      .limit(1)
      .executeTakeFirst();

    if (!adminUser) {
      // Skip backfilling for inactive tenants with no users
      continue;
    }

    // Find first campaign for this tenant
    let campaign = await db
      .selectFrom('campaigns')
      .select('id')
      .where('tenant_id', '=', tenant.id)
      .limit(1)
      .executeTakeFirst();

    if (!campaign) {
      // Create a default campaign if none exists
      campaign = await db
        .insertInto('campaigns')
        .values({
          tenant_id: tenant.id,
          name: 'Default Campaign',
          admin_id: adminUser.id,
          createdby_id: adminUser.id,
          updatedby_id: adminUser.id,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
    }

    // Check if there is an existing household with all null/empty address fields
    let blankHousehold = await db
      .selectFrom('households')
      .select('id')
      .where('tenant_id', '=', tenant.id)
      .where((eb) =>
        eb.and([
          eb.or([eb('street1', 'is', null), eb('street1', '=', '')]),
          eb.or([eb('city', 'is', null), eb('city', '=', '')]),
        ]),
      )
      .limit(1)
      .executeTakeFirst();

    if (!blankHousehold) {
      // Create a new blank household
      blankHousehold = await db
        .insertInto('households')
        .values({
          tenant_id: tenant.id,
          campaign_id: campaign.id as any,
          createdby_id: adminUser.id,
          updatedby_id: adminUser.id,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
    }

    // Update the tenant's placeholder_household_id
    await db
      .updateTable('tenants')
      .set({ placeholder_household_id: blankHousehold.id })
      .where('id', '=', tenant.id)
      .execute();
  }
}

export async function down(): Promise<void> {
  // Safe to leave placeholder_household_id as is
}
