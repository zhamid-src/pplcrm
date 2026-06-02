import { sql } from 'kysely';
import { PersonsRepo } from '../repositories/persons.repo';

export class DuplicateMaintenanceService {
  private readonly personsRepo = new PersonsRepo();

  /**
   * Recompute all duplicates for a tenant from scratch.
   * This is run as a nightly job to ensure consistency.
   */
  public async recomputeAllDuplicates(tenantId: string): Promise<void> {
    const db = this.personsRepo.db;

    // 1. Delete all potential duplicates for the tenant
    await db
      .deleteFrom('potential_duplicates')
      .where('tenant_id', '=', tenantId)
      .execute();

    // 2. Fetch the placeholder household id
    const tenantRow = await db
      .selectFrom('tenants')
      .select('placeholder_household_id')
      .where('id', '=', tenantId)
      .executeTakeFirst();
    const placeholderHhId = tenantRow?.placeholder_household_id;

    // 3. Find duplicates using bulk queries (equivalent to the old findPotentialDuplicates logic)
    // Email duplicates
    const duplicateEmails = await db
      .selectFrom('persons')
      .select([
        sql<string>`lower(email)`.as('email_lower'),
      ])
      .select((eb) => [
        eb.fn.agg<string[]>('array_agg', ['persons.id']).as('ids'),
      ])
      .where('tenant_id', '=', tenantId)
      .where('email', 'is not', null)
      .where(sql`trim(email)`, '!=', '')
      .groupBy(sql`lower(email)`)
      .having(sql`count(persons.id)`, '>', 1)
      .execute();

    // Household name duplicates
    const duplicateNamesInSameHousehold = await db
      .selectFrom('persons')
      .select([
        sql<string>`lower(first_name)`.as('first_name_lower'),
        sql<string>`lower(last_name)`.as('last_name_lower'),
        'household_id',
      ])
      .select((eb) => [
        eb.fn.agg<string[]>('array_agg', ['persons.id']).as('ids'),
      ])
      .where('tenant_id', '=', tenantId)
      .where('first_name', 'is not', null)
      .where('last_name', 'is not', null)
      .where(sql`trim(first_name)`, '!=', '')
      .where(sql`trim(last_name)`, '!=', '')
      .where('household_id', 'is not', null)
      .$if(!!placeholderHhId, (qb) => qb.where('household_id', '!=', placeholderHhId!))
      .groupBy([sql`lower(first_name)`, sql`lower(last_name)`, 'household_id'])
      .having(sql`count(persons.id)`, '>', 1)
      .execute();

    // Address name duplicates
    const duplicateNamesInSameAddress = await db
      .selectFrom('persons')
      .innerJoin('households', 'persons.household_id', 'households.id')
      .select([
        sql<string>`lower(persons.first_name)`.as('first_name_lower'),
        sql<string>`lower(persons.last_name)`.as('last_name_lower'),
        'households.address_fp_full',
      ])
      .select((eb) => [
        eb.fn.agg<string[]>('array_agg', ['persons.id']).as('ids'),
      ])
      .where('persons.tenant_id', '=', tenantId)
      .where('persons.first_name', 'is not', null)
      .where('persons.last_name', 'is not', null)
      .where(sql`trim(persons.first_name)`, '!=', '')
      .where(sql`trim(persons.last_name)`, '!=', '')
      .where('households.address_fp_full', 'is not', null)
      .where(sql`trim(households.address_fp_full)`, '!=', '')
      .groupBy([sql`lower(persons.first_name)`, sql`lower(persons.last_name)`, 'households.address_fp_full'])
      .having(sql`count(persons.id)`, '>', 1)
      .execute();

    // 4. Collect names of people to construct friendly reasons
    const allMatchingPersonIds = new Set<string>();
    const collectIds = (groups: Array<{ ids: string[] }>) => {
      for (const g of groups) {
        if (Array.isArray(g.ids)) {
          g.ids.forEach((id) => allMatchingPersonIds.add(String(id)));
        }
      }
    };
    collectIds(duplicateEmails);
    collectIds(duplicateNamesInSameHousehold);
    collectIds(duplicateNamesInSameAddress);

    const personsMap = new Map<string, { first_name: string | null; last_name: string | null }>();
    if (allMatchingPersonIds.size > 0) {
      const dbRows = await db
        .selectFrom('persons')
        .select(['id', 'first_name', 'last_name'])
        .where('tenant_id', '=', tenantId)
        .where('id', 'in', Array.from(allMatchingPersonIds))
        .execute();
      for (const row of dbRows) {
        personsMap.set(String(row.id), { first_name: row.first_name, last_name: row.last_name });
      }
    }

    const inserts: any[] = [];

    // Email duplicates
    for (const group of duplicateEmails) {
      const email = group.email_lower;
      const key = `email:${email}`;
      const reason = `Matching Email: "${email}"`;
      for (const id of group.ids) {
        inserts.push({
          tenant_id: tenantId,
          group_key: key,
          person_id: String(id),
          reason,
        });
      }
    }

    // Household name duplicates
    for (const group of duplicateNamesInSameHousehold) {
      const key = `household:${group.household_id}:${group.first_name_lower}:${group.last_name_lower}`;
      const firstPerson = personsMap.get(String(group.ids[0]));
      const reason = `Matching Name at Same Household: "${firstPerson?.first_name || ''} ${firstPerson?.last_name || ''}"`.replace(/\s{2,}/g, ' ').trim();
      for (const id of group.ids) {
        inserts.push({
          tenant_id: tenantId,
          group_key: key,
          person_id: String(id),
          reason,
        });
      }
    }

    // Address name duplicates
    for (const group of duplicateNamesInSameAddress) {
      const key = `address:${group.address_fp_full}:${group.first_name_lower}:${group.last_name_lower}`;
      const firstPerson = personsMap.get(String(group.ids[0]));
      const reason = `Matching Name at Same Address: "${firstPerson?.first_name || ''} ${firstPerson?.last_name || ''}"`.replace(/\s{2,}/g, ' ').trim();
      for (const id of group.ids) {
        inserts.push({
          tenant_id: tenantId,
          group_key: key,
          person_id: String(id),
          reason,
        });
      }
    }

    if (inserts.length > 0) {
      // Use chunked inserts just in case the list is very large
      const chunkSize = 1000;
      for (let i = 0; i < inserts.length; i += chunkSize) {
        const chunk = inserts.slice(i, i + chunkSize);
        await db
          .insertInto('potential_duplicates')
          .values(chunk)
          .execute();
      }
    }
  }

  /**
   * Run incremental duplicate maintenance for a list of modified persons and/or groups.
   */
  public async runMaintenance(
    tenantId: string,
    personIds: string[],
    explicitGroupKeys: string[] = []
  ): Promise<void> {
    const db = this.personsRepo.db;

    // 1. Fetch the placeholder household id
    const tenantRow = await db
      .selectFrom('tenants')
      .select('placeholder_household_id')
      .where('id', '=', tenantId)
      .executeTakeFirst();
    const placeholderHhId = tenantRow?.placeholder_household_id;

    // 2. Identify all affected group keys
    const affectedGroupKeys = new Set<string>(explicitGroupKeys);

    // If personIds are provided, find their current and former group keys
    if (personIds.length > 0) {
      // Find former group keys they belonged to
      const formerGroupKeys = await db
        .selectFrom('potential_duplicates')
        .select('group_key')
        .where('tenant_id', '=', tenantId)
        .where('person_id', 'in', personIds)
        .execute();
      for (const row of formerGroupKeys) {
        affectedGroupKeys.add(row.group_key);
      }

      // Query the persons' current details (including household address fingerprints)
      const currentPersons = await db
        .selectFrom('persons')
        .leftJoin('households', 'persons.household_id', 'households.id')
        .select([
          'persons.id',
          'persons.first_name',
          'persons.last_name',
          'persons.email',
          'persons.household_id',
          'households.address_fp_full',
        ])
        .where('persons.tenant_id', '=', tenantId)
        .where('persons.id', 'in', personIds)
        .execute();

      // Compute current keys for each person
      for (const p of currentPersons) {
        const currentKeys = this.computePersonGroupKeys(p, placeholderHhId);
        for (const k of currentKeys) {
          affectedGroupKeys.add(k);
        }
      }

      // Delete all existing duplicate entries for these persons (they'll be re-evaluated as part of the affected group keys)
      await db
        .deleteFrom('potential_duplicates')
        .where('tenant_id', '=', tenantId)
        .where('person_id', 'in', personIds)
        .execute();
    }

    // 3. Re-evaluate each affected group key
    for (const groupKey of affectedGroupKeys) {
      await this.reevaluateGroupKey(tenantId, groupKey);
    }
  }

  /**
   * Helper to compute all valid duplicate group keys for a single person.
   */
  private computePersonGroupKeys(
    person: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      household_id: string | null;
      address_fp_full: string | null;
    },
    placeholderHhId: string | null | undefined
  ): string[] {
    const keys: string[] = [];

    // Email key
    if (person.email && person.email.trim().length > 0) {
      keys.push(`email:${person.email.trim().toLowerCase()}`);
    }

    // Household key
    if (
      person.first_name &&
      person.last_name &&
      person.first_name.trim().length > 0 &&
      person.last_name.trim().length > 0 &&
      person.household_id &&
      (!placeholderHhId || String(person.household_id) !== String(placeholderHhId))
    ) {
      keys.push(`household:${person.household_id}:${person.first_name.trim().toLowerCase()}:${person.last_name.trim().toLowerCase()}`);
    }

    // Address fingerprint key
    if (
      person.first_name &&
      person.last_name &&
      person.first_name.trim().length > 0 &&
      person.last_name.trim().length > 0 &&
      person.address_fp_full &&
      person.address_fp_full.trim().length > 0
    ) {
      keys.push(`address:${person.address_fp_full.trim().toLowerCase()}:${person.first_name.trim().toLowerCase()}:${person.last_name.trim().toLowerCase()}`);
    }

    return keys;
  }

  /**
   * Re-evaluates a single duplicate group key.
   * If there is more than 1 matching person, inserts/upserts them.
   * Otherwise, deletes any entries for that key.
   */
  private async reevaluateGroupKey(tenantId: string, groupKey: string): Promise<void> {
    const db = this.personsRepo.db;

    // Find all matching persons currently in the database for this group key
    let matchingPersons: Array<{ id: string; first_name: string | null; last_name: string | null }> = [];

    if (groupKey.startsWith('email:')) {
      const email = groupKey.slice('email:'.length);
      matchingPersons = await db
        .selectFrom('persons')
        .select(['id', 'first_name', 'last_name'])
        .where('tenant_id', '=', tenantId)
        .where('email', 'is not', null)
        .where(sql`lower(email)`, '=', email)
        .execute();
    } else if (groupKey.startsWith('household:')) {
      const rest = groupKey.slice('household:'.length);
      const colon1 = rest.indexOf(':');
      const householdId = rest.slice(0, colon1);
      const rest2 = rest.slice(colon1 + 1);
      const colon2 = rest2.indexOf(':');
      const firstName = rest2.slice(0, colon2);
      const lastName = rest2.slice(colon2 + 1);

      matchingPersons = await db
        .selectFrom('persons')
        .select(['id', 'first_name', 'last_name'])
        .where('tenant_id', '=', tenantId)
        .where('household_id', '=', householdId)
        .where('first_name', 'is not', null)
        .where('last_name', 'is not', null)
        .where(sql`lower(first_name)`, '=', firstName)
        .where(sql`lower(last_name)`, '=', lastName)
        .execute();
    } else if (groupKey.startsWith('address:')) {
      const rest = groupKey.slice('address:'.length);
      const colon1 = rest.indexOf(':');
      const addressFp = rest.slice(0, colon1);
      const rest2 = rest.slice(colon1 + 1);
      const colon2 = rest2.indexOf(':');
      const firstName = rest2.slice(0, colon2);
      const lastName = rest2.slice(colon2 + 1);

      matchingPersons = await db
        .selectFrom('persons')
        .innerJoin('households', 'persons.household_id', 'households.id')
        .select(['persons.id', 'persons.first_name', 'persons.last_name'])
        .where('persons.tenant_id', '=', tenantId)
        .where('households.address_fp_full', '=', addressFp)
        .where('persons.first_name', 'is not', null)
        .where('persons.last_name', 'is not', null)
        .where(sql`lower(persons.first_name)`, '=', firstName)
        .where(sql`lower(persons.last_name)`, '=', lastName)
        .execute();
    }

    // Always delete existing entries for this group key
    await db
      .deleteFrom('potential_duplicates')
      .where('tenant_id', '=', tenantId)
      .where('group_key', '=', groupKey)
      .execute();

    // If there is still a duplicate group (match count > 1), insert them all
    if (matchingPersons.length > 1) {
      let reason = '';
      if (groupKey.startsWith('email:')) {
        reason = `Matching Email: "${groupKey.slice('email:'.length)}"`;
      } else {
        const firstPerson = matchingPersons[0];
        const fullName = `${firstPerson.first_name || ''} ${firstPerson.last_name || ''}`.replace(/\s{2,}/g, ' ').trim();
        if (groupKey.startsWith('household:')) {
          reason = `Matching Name at Same Household: "${fullName}"`;
        } else if (groupKey.startsWith('address:')) {
          reason = `Matching Name at Same Address: "${fullName}"`;
        }
      }

      const rowsToInsert = matchingPersons.map((p) => ({
        tenant_id: tenantId,
        group_key: groupKey,
        person_id: String(p.id),
        reason,
      }));

      await db
        .insertInto('potential_duplicates')
        .values(rowsToInsert)
        .execute();
    }
  }
}
