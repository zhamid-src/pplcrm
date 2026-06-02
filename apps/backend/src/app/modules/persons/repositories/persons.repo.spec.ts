import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PersonsRepo } from './persons.repo';
import { HouseholdRepo } from '../../households/repositories/households.repo';
import { CompaniesRepo } from '../../companies/repositories/companies.repo';
import { BaseRepository } from '../../../lib/base.repo';
import { DuplicateMaintenanceService } from '../services/duplicate-maintenance.service';

async function createTestSeed(db: any) {
  const rand = () => String(Math.floor(Math.random() * 100000000) + 10000000);
  const tenantId = rand();
  const userId = rand();
  const campaignId = rand();
  const householdId = rand();

  // 1. Tenant
  await db
    .insertInto('tenants')
    .values({
      id: tenantId,
      name: 'Test Tenant',
    })
    .execute();

  // 2. User
  await db
    .insertInto('authusers')
    .values({
      id: userId,
      tenant_id: tenantId,
      email: `test-${userId}@example.com`,
      password: 'password',
      first_name: 'Test',
      last_name: 'User',
      verified: true,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  // Update tenant admin and creator
  await db.updateTable('tenants').set({ admin_id: userId, createdby_id: userId }).where('id', '=', tenantId).execute();

  // 3. Campaign
  await db
    .insertInto('campaigns')
    .values({
      id: campaignId,
      tenant_id: tenantId,
      admin_id: userId,
      name: 'Test Campaign',
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  // 4. Household
  await db
    .insertInto('households')
    .values({
      id: householdId,
      tenant_id: tenantId,
      campaign_id: campaignId,
      createdby_id: userId,
      updatedby_id: userId,
    })
    .execute();

  return { tenantId, userId, campaignId, householdId };
}

async function cleanTenant(db: any, tenantId: string) {
  await db
    .updateTable('tenants')
    .set({ admin_id: null, createdby_id: null, placeholder_household_id: null })
    .where('id', '=', tenantId)
    .execute();
  await db.deleteFrom('potential_duplicates').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_households_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('companies').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('settings').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('sessions').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('PersonsRepo Integration', () => {
  const repo = new PersonsRepo();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let campaignId: string;
  let householdId: string;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    campaignId = seed.campaignId;
    householdId = seed.householdId;
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  it('should clear file_id for import', async () => {
    const importId = '123456';

    const person = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'File',
        last_name: 'User',
        file_id: importId,
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    expect(person.file_id).toBe(importId);

    const ids = await repo.getIdsByFileId({ tenant_id: tenantId, file_id: importId });
    expect(ids).toContain(person.id);

    await repo.clearFileIdForImport({ tenant_id: tenantId, import_id: importId, user_id: userId });

    const check = await repo.getOneBy('id', { tenant_id: tenantId, value: person.id });
    expect(check?.file_id).toBeNull();
  });

  it('should return household_is_placeholder true only for persons in the placeholder household', async () => {
    // 1. Create a person in the default household (householdId)
    const p1 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Regular',
        last_name: 'User',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    // 2. Set householdId as the tenant's placeholder household
    await db.updateTable('tenants').set({ placeholder_household_id: householdId }).where('id', '=', tenantId).execute();

    // 3. Create a second household that is NOT a placeholder
    const otherHhId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('households')
      .values({
        id: otherHhId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // 4. Create a person in the second household
    const p2 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: otherHhId,
        first_name: 'Other',
        last_name: 'User',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    // 5. Fetch all persons with address
    const result = await repo.getAllWithAddress({ tenant_id: tenantId });
    expect(result.rows).toHaveLength(2);

    const r1 = result.rows.find((r) => String(r.id) === String(p1.id));
    const r2 = result.rows.find((r) => String(r.id) === String(p2.id));

    expect(r1?.household_is_placeholder).toBe(true);
    expect(r2?.household_is_placeholder).toBe(false);
  });

  it('should fetch persons by ids with tag filtering', async () => {
    const p1 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Tagged',
        last_name: 'One',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const p2 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Untagged',
        last_name: 'Two',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const randTagId = String(Math.floor(Math.random() * 100000000) + 10000000);
    const tag = await db
      .insertInto('tags')
      .values({
        id: randTagId,
        tenant_id: tenantId,
        name: 'TestTag',
        deletable: true,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .returningAll()
      .execute();

    await db
      .insertInto('map_peoples_tags')
      .values({
        tenant_id: tenantId,
        person_id: p1.id,
        tag_id: randTagId,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Fetch without tag filtering
    const allFetched = await repo.getByIds({ tenant_id: tenantId, ids: [p1.id, p2.id] });
    expect(allFetched).toHaveLength(2);

    // Fetch with tag filtering
    const taggedFetched = await repo.getByIds({ tenant_id: tenantId, ids: [p1.id, p2.id], tags: ['TestTag'] });
    expect(taggedFetched).toHaveLength(1);
    expect(taggedFetched[0].id).toBe(p1.id);
  });

  it('should retrieve created stats', async () => {
    await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Stats',
        last_name: 'User',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const stats = await repo.getCreatedStats({ tenant_id: tenantId, user_id: userId });
    expect(stats.total).toBe(1);
    expect(stats.last_created_at).toBeInstanceOf(Date);
  });

  it('should find potential duplicates by name + household and name + address', async () => {
    // 1. Name + Household duplicates (Jane Doe in same household)
    const p1 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Jane',
        last_name: 'Doe',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const p2 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'jane',
        last_name: 'doe',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    // 2. Name + Address duplicates (John Smith in different households but same address fingerprint)
    // Create a second household with same address fingerprint
    const householdId2 = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('households')
      .values({
        id: householdId2,
        tenant_id: tenantId,
        campaign_id: campaignId,
        address_fp_full: '123 Main St, Springfield',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Update first household's address fingerprint to match
    await db
      .updateTable('households')
      .set({ address_fp_full: '123 Main St, Springfield' })
      .where('id', '=', householdId)
      .execute();

    const p3 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'John',
        last_name: 'Smith',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const p4 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId2,
        first_name: 'john',
        last_name: 'smith',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const maintenanceSvc = new DuplicateMaintenanceService();
    await maintenanceSvc.recomputeAllDuplicates(tenantId);

    const dups = await repo.findPotentialDuplicates(tenantId);
    expect(dups.length).toBeGreaterThanOrEqual(2);

    const householdGroup = dups.find((d) => d.reason.includes('Same Household'));
    expect(householdGroup).toBeDefined();
    expect(householdGroup.persons.map((p: any) => p.id)).toContain(p1.id);
    expect(householdGroup.persons.map((p: any) => p.id)).toContain(p2.id);

    const addressGroup = dups.find((d) => d.reason.includes('Same Address') && d.reason.toLowerCase().includes('john'));
    expect(addressGroup).toBeDefined();
    expect(addressGroup.persons.map((p: any) => p.id)).toContain(p3.id);
    expect(addressGroup.persons.map((p: any) => p.id)).toContain(p4.id);
  });

  it('should transactionally merge source person into target person', async () => {
    const target = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Primary',
        last_name: 'User',
        email: 'primary@example.com',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const source = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Primary',
        last_name: 'User',
        mobile: '123-456-7890',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    const randTagId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('tags')
      .values({
        id: randTagId,
        tenant_id: tenantId,
        name: 'MergeTag',
        deletable: true,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    await db
      .insertInto('map_peoples_tags')
      .values({
        tenant_id: tenantId,
        person_id: source.id,
        tag_id: randTagId,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    await repo.mergePersons({
      tenant_id: tenantId,
      target_id: target.id,
      source_id: source.id,
      user_id: userId,
    });

    const updatedTarget = await repo.getOneBy('id', { tenant_id: tenantId, value: target.id });
    expect(updatedTarget?.mobile).toBe('123-456-7890');

    const targetTags = await db
      .selectFrom('map_peoples_tags')
      .where('tenant_id', '=', tenantId)
      .where('person_id', '=', target.id)
      .selectAll()
      .execute();
    expect(targetTags.map((t: any) => t.tag_id)).toContain(randTagId);

    const checkSource = await repo.getOneBy('id', { tenant_id: tenantId, value: source.id });
    expect(checkSource).toBeUndefined();
  });

  it('should incrementally detect duplicates on person insertion', async () => {
    const maintenanceSvc = new DuplicateMaintenanceService();

    // Add first person
    const p1 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'IncFirst',
        last_name: 'IncLast',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    // Run maintenance for p1 -> should find no duplicates yet
    await maintenanceSvc.runMaintenance(tenantId, [p1.id]);
    let dups = await repo.findPotentialDuplicates(tenantId);
    expect(dups).toHaveLength(0);

    // Add second person with same name in same household
    const p2 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'incfirst',
        last_name: 'inclast',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    // Run maintenance for p2 -> should detect duplicate
    await maintenanceSvc.runMaintenance(tenantId, [p2.id]);
    dups = await repo.findPotentialDuplicates(tenantId);
    expect(dups).toHaveLength(1);
    expect(dups[0].reason).toContain('Matching Name at Same Household');
    expect(dups[0].persons.map((p: any) => p.id)).toContain(p1.id);
    expect(dups[0].persons.map((p: any) => p.id)).toContain(p2.id);
  });

  it('should incrementally clean up duplicates when a person is updated to be unique', async () => {
    const maintenanceSvc = new DuplicateMaintenanceService();

    // 1. Create duplicate name persons
    const p1 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'IncFirst',
        last_name: 'IncLast',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });
    const p2 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'incfirst',
        last_name: 'inclast',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    // Run maintenance -> duplicate exists
    await maintenanceSvc.runMaintenance(tenantId, [p1.id, p2.id]);
    let dups = await repo.findPotentialDuplicates(tenantId);
    expect(dups).toHaveLength(1);

    // 2. Update p2 to have a unique name
    await repo.update({
      tenant_id: tenantId,
      id: p2.id,
      row: { first_name: 'UniqueFirst' },
    });

    // Run maintenance for updated p2 -> duplicate should be cleared
    await maintenanceSvc.runMaintenance(tenantId, [p2.id]);
    dups = await repo.findPotentialDuplicates(tenantId);
    expect(dups).toHaveLength(0);
  });

  it('should incrementally clean up duplicate groups when one duplicate is deleted', async () => {
    const maintenanceSvc = new DuplicateMaintenanceService();

    // 1. Create duplicates
    const p1 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'IncFirst',
        last_name: 'IncLast',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });
    const p2 = await repo.add({
      row: {
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'incfirst',
        last_name: 'inclast',
        createdby_id: userId,
        updatedby_id: userId,
      },
    });

    await maintenanceSvc.runMaintenance(tenantId, [p1.id, p2.id]);
    let dups = await repo.findPotentialDuplicates(tenantId);
    expect(dups).toHaveLength(1);

    // 2. Fetch duplicate keys for deleted person and delete them (simulating deleteMany logic)
    const activeGroupKeys = await db
      .selectFrom('potential_duplicates')
      .select('group_key')
      .where('tenant_id', '=', tenantId)
      .where('person_id', '=', p2.id)
      .execute();
    const groupKeys = activeGroupKeys.map((k: any) => k.group_key);

    await repo.delete({ tenant_id: tenantId, id: p2.id });

    // Run maintenance on the group keys -> should clear duplicates
    await maintenanceSvc.runMaintenance(tenantId, [], groupKeys);
    dups = await repo.findPotentialDuplicates(tenantId);
    expect(dups).toHaveLength(0);
  });
});

describe('HouseholdRepo Duplicates', () => {
  const householdsRepo = new HouseholdRepo();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let campaignId: string;
  let householdId: string;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    campaignId = seed.campaignId;
    householdId = seed.householdId;
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  it('should exclude the placeholder household in getAllWithPeopleCount', async () => {
    // Create a household to act as the placeholder
    const placeholderHhId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('households')
      .values({
        id: placeholderHhId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Set it as the tenant's placeholder household
    await db
      .updateTable('tenants')
      .set({ placeholder_household_id: placeholderHhId })
      .where('id', '=', tenantId)
      .execute();

    // Fetch households
    const result = await householdsRepo.getAllWithPeopleCount({ tenant_id: tenantId });

    // The placeholder household should be hidden
    const ids = result.rows.map((row: any) => String(row.id));
    expect(ids).toContain(householdId);
    expect(ids).not.toContain(placeholderHhId);
    expect(result.count).toBe(1);
  });

  it('should find potential duplicate households by address fingerprint', async () => {
    // Modify first household address fingerprint
    await db
      .updateTable('households')
      .set({ address_fp_full: '456 Main St, Springfield' })
      .where('id', '=', householdId)
      .execute();

    // Create a second duplicate household
    const randId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('households')
      .values({
        id: randId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        address_fp_full: '456 Main St, Springfield',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    const dups = await householdsRepo.findPotentialDuplicates(tenantId);
    expect(dups).toHaveLength(1);
    expect(dups[0].households).toHaveLength(2);
  });

  it('should merge source household into target household transactionally', async () => {
    // Set address fp for target
    await db
      .updateTable('households')
      .set({ address_fp_full: '789 Elm St, Springfield', home_phone: '111-222-3333' })
      .where('id', '=', householdId)
      .execute();

    // Create source household
    const sourceHhId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('households')
      .values({
        id: sourceHhId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        address_fp_full: '789 Elm St, Springfield',
        notes: 'Source notes',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Create tag to merge
    const randTagId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('tags')
      .values({
        id: randTagId,
        tenant_id: tenantId,
        name: 'HouseholdMergeTag',
        deletable: true,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Tag the source household
    await db
      .insertInto('map_households_tags')
      .values({
        tenant_id: tenantId,
        household_id: sourceHhId,
        tag_id: randTagId,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Reassign person to source household to test reassigning
    const personId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('persons')
      .values({
        id: personId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: sourceHhId,
        first_name: 'Resident',
        last_name: 'One',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    await householdsRepo.mergeHouseholds({
      tenant_id: tenantId,
      target_id: householdId,
      source_id: sourceHhId,
      user_id: userId,
    });

    // Check target household got source fields (e.g. notes)
    const updatedTarget = await householdsRepo.getOneBy('id', { tenant_id: tenantId, value: householdId });
    expect(updatedTarget?.notes).toBe('Source notes');
    expect(updatedTarget?.home_phone).toBe('111-222-3333');

    // Check tags transferred
    const targetTags = await db
      .selectFrom('map_households_tags')
      .where('tenant_id', '=', tenantId)
      .where('household_id', '=', householdId)
      .selectAll()
      .execute();
    expect(targetTags.map((t: any) => t.tag_id)).toContain(randTagId);

    // Check person household reassigned
    const person = await db.selectFrom('persons').selectAll().where('id', '=', personId).executeTakeFirst();
    expect(person?.household_id).toBe(householdId);

    // Check source household deleted
    const checkSource = await householdsRepo.getOneBy('id', { tenant_id: tenantId, value: sourceHhId });
    expect(checkSource).toBeUndefined();
  });
});

describe('CompaniesRepo Duplicates', () => {
  const companiesRepo = new CompaniesRepo();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let campaignId: string;
  let householdId: string;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    campaignId = seed.campaignId;
    householdId = seed.householdId;
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  it('should find potential duplicate companies by name', async () => {
    // Create first company
    const compId1 = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('companies')
      .values({
        id: compId1,
        tenant_id: tenantId,
        name: 'Acme Corp',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Create second duplicate company
    const compId2 = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('companies')
      .values({
        id: compId2,
        tenant_id: tenantId,
        name: ' acme corp  ', // test spacing and case
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    const dups = await companiesRepo.findPotentialDuplicates(tenantId);
    expect(dups).toHaveLength(1);
    expect(dups[0].companies).toHaveLength(2);
  });

  it('should merge source company into target company transactionally', async () => {
    // Create target
    const targetCompId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('companies')
      .values({
        id: targetCompId,
        tenant_id: tenantId,
        name: 'Acme',
        website: 'acme.com',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Create source
    const sourceCompId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('companies')
      .values({
        id: sourceCompId,
        tenant_id: tenantId,
        name: 'Acme',
        description: 'Acme company description',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Create person linked to source company
    const personId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('persons')
      .values({
        id: personId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        company_id: sourceCompId,
        first_name: 'Employee',
        last_name: 'One',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    await companiesRepo.mergeCompanies({
      tenant_id: tenantId,
      target_id: targetCompId,
      source_id: sourceCompId,
      user_id: userId,
    });

    // Check target company merged fields
    const updatedTarget = await companiesRepo.getOneBy('id', { tenant_id: tenantId, value: targetCompId });
    expect(updatedTarget?.description).toBe('Acme company description');
    expect(updatedTarget?.website).toBe('acme.com');

    // Check person company reassigned
    const person = await db.selectFrom('persons').selectAll().where('id', '=', personId).executeTakeFirst();
    expect(String(person?.company_id)).toBe(targetCompId);

    // Check source deleted
    const checkSource = await companiesRepo.getOneBy('id', { tenant_id: tenantId, value: sourceCompId });
    expect(checkSource).toBeUndefined();
  });
});
