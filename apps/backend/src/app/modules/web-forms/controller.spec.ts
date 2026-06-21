import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { WebFormsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';
import { sql } from 'kysely';

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

  // Update tenant admin, creator, and placeholder household
  await db
    .updateTable('tenants')
    .set({
      admin_id: userId,
      createdby_id: userId,
      placeholder_household_id: householdId,
    })
    .where('id', '=', tenantId)
    .execute();

  return { tenantId, userId, campaignId, householdId };
}

async function cleanTenant(db: any, tenantId: string) {
  await db
    .updateTable('tenants')
    .set({ admin_id: null, createdby_id: null, placeholder_household_id: null })
    .where('id', '=', tenantId)
    .execute();
  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_lists_persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('lists').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('web_forms').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('WebFormsController Integration', () => {
  const controller = new WebFormsController();
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

  it('should successfully submit form and create a new contact with tags and lists', async () => {
    // 1. Create a List
    const listId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('lists')
      .values({
        id: listId,
        tenant_id: tenantId,
        name: 'Newsletter Subscribers',
        object: 'people',
        is_dynamic: false,
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // 2. Create a Web Form definition
    const formId = randomUUID();
    await db
      .insertInto('web_forms')
      .values({
        id: formId,
        tenant_id: tenantId,
        name: 'Newsletter Form',
        description: 'Public newsletter signup form',
        redirect_url: 'https://example.com/thankyou',
        target_tags: JSON.stringify(['newsletter', 'public-form']),
        target_lists: JSON.stringify([listId]),
        status: 'active',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // 3. Submit the form
    const payload = {
      email: 'visitor@example.com',
      first_name: 'John',
      last_name: 'Doe',
      mobile: '555-0199',
      notes: 'I would like to receive updates.',
    };

    const res = await controller.submitFormPublic(formId, payload, '127.0.0.1');
    expect(res.redirect_url).toBe('https://example.com/thankyou');

    // Verify background job was queued
    const job = await db
      .selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'send-webform-notifications')
      .where(sql`payload->>'formId'`, '=', formId)
      .executeTakeFirst();
    expect(job).toBeDefined();
    expect(['pending', 'completed', 'processed']).toContain(job.status);

    // 4. Verify Contact Creation
    const person = await db
      .selectFrom('persons')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('email', '=', 'visitor@example.com')
      .executeTakeFirst();

    expect(person).toBeDefined();
    expect(person.first_name).toBe('John');
    expect(person.last_name).toBe('Doe');
    expect(person.mobile).toBe('555-0199');
    expect(person.notes).toBe('I would like to receive updates.');
    expect(person.household_id).toBe(householdId);

    // 5. Verify Tag Mapping
    const personTags = await db
      .selectFrom('map_peoples_tags')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .select('tags.name')
      .where('map_peoples_tags.tenant_id', '=', tenantId)
      .where('map_peoples_tags.person_id', '=', person.id)
      .execute();

    const tagNames = personTags.map((t: any) => t.name);
    expect(tagNames).toContain('newsletter');
    expect(tagNames).toContain('public-form');
    expect(tagNames).toContain('source: newsletter form');

    // 6. Verify List Mapping
    const personLists = await db
      .selectFrom('map_lists_persons')
      .select('list_id')
      .where('tenant_id', '=', tenantId)
      .where('person_id', '=', person.id)
      .execute();

    const assignedLists = personLists.map((l: any) => l.list_id);
    expect(assignedLists).toContain(listId);
  });

  it('should non-destructively merge details when email already exists', async () => {
    // 1. Pre-insert an existing person with minimal details
    const existingPersonId = String(Math.floor(Math.random() * 100000000) + 10000000);
    await db
      .insertInto('persons')
      .values({
        id: existingPersonId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        email: 'dup@example.com',
        first_name: 'Existing',
        notes: 'Original notes',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // 2. Create Web Form definition
    const formId = randomUUID();
    await db
      .insertInto('web_forms')
      .values({
        id: formId,
        tenant_id: tenantId,
        name: 'Newsletter Form',
        status: 'active',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // 3. Submit form with new details
    const payload = {
      email: 'dup@example.com',
      last_name: 'Submitter',
      mobile: '12345678',
      notes: 'New form signup.',
    };

    await controller.submitFormPublic(formId, payload, '127.0.0.1');

    // 4. Verify Person fields are merged non-destructively
    const person = await db
      .selectFrom('persons')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', existingPersonId)
      .executeTakeFirst();

    expect(person.first_name).toBe('Existing'); // Unchanged
    expect(person.last_name).toBe('Submitter'); // Filled in
    expect(person.mobile).toBe('12345678'); // Filled in
    expect(person.notes).toContain('Original notes'); // Appended
    expect(person.notes).toContain('New form signup.');
  });

  it('should block submissions if honeypot field is filled', async () => {
    // Create Web Form
    const formId = randomUUID();
    await db
      .insertInto('web_forms')
      .values({
        id: formId,
        tenant_id: tenantId,
        name: 'Newsletter Form',
        status: 'active',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // Submit with honeypot field _hp filled
    const payload = {
      email: 'bot@example.com',
      _hp: 'im-a-bot-123',
    };

    const res = await controller.submitFormPublic(formId, payload, '127.0.0.1');
    expect(res.redirect_url).toBeNull();

    // Verify no person was created
    const person = await db
      .selectFrom('persons')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('email', '=', 'bot@example.com')
      .executeTakeFirst();

    expect(person).toBeUndefined();
  });

  it('should automatically apply Donor tag when submitting a donation web form', async () => {
    // 1. Create a Web Form definition of type donation
    const formId = randomUUID();
    await db
      .insertInto('web_forms')
      .values({
        id: formId,
        tenant_id: tenantId,
        name: 'Donation Form Test',
        status: 'active',
        form_type: 'donation',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // 2. Submit the donation form
    const payload = {
      email: 'donor@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
      amount: '50.00',
      country: 'CA',
      state: 'ON',
      street1: '123 Main St',
      city: 'Toronto',
      zip: 'M5V 2T6',
    };

    try {
      await controller.submitFormPublic(formId, payload, '127.0.0.1');
    } catch (err) {
      // Mock Stripe key redirect or exception is fine
    }

    // 3. Verify Contact Creation, Household Address, and Tag Mapping
    const person = await db
      .selectFrom('persons')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('email', '=', 'donor@example.com')
      .executeTakeFirst();

    expect(person).toBeDefined();
    expect(person!.household_id).not.toBeNull();

    const hh = await db
      .selectFrom('households')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', person!.household_id as any)
      .executeTakeFirst();

    expect(hh).toBeDefined();
    expect(hh!.street1).toBe('123 Main St');
    expect(hh!.city).toBe('Toronto');
    expect(hh!.zip).toBe('M5V 2T6');

    const personTags = await db
      .selectFrom('map_peoples_tags')
      .innerJoin('tags', 'tags.id', 'map_peoples_tags.tag_id')
      .select('tags.name')
      .where('map_peoples_tags.tenant_id', '=', tenantId)
      .where('map_peoples_tags.person_id', '=', person!.id)
      .execute();

    const tagNames = personTags.map((t: any) => t.name);
    expect(tagNames).toContain('donor');
    expect(tagNames).toContain('source: donation form test');
  });

  it('should validate user-configured required fields on standard form submission', async () => {
    // 1. Create a web form with a required field 'mobile:required'
    const formId = crypto.randomUUID();
    await db
      .insertInto('web_forms')
      .values({
        id: formId,
        tenant_id: tenantId,
        form_type: 'standard',
        name: 'Required Fields Test',
        fields: JSON.stringify(['first_name', 'mobile:required']),
        status: 'active',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    // 2. Submit the form without the required mobile field
    const payloadWithoutMobile = {
      email: 'missing-mobile@example.com',
      first_name: 'Jane',
    };

    await expect(controller.submitFormPublic(formId, payloadWithoutMobile, '127.0.0.2')).rejects.toThrow(
      'Mobile / Phone is required.',
    );

    // 3. Submit the form with the required mobile field
    const payloadWithMobile = {
      email: 'has-mobile@example.com',
      first_name: 'Jane',
      mobile: '555-0000',
    };

    const res = await controller.submitFormPublic(formId, payloadWithMobile, '127.0.0.3');
    expect(res).toBeDefined();

    // 4. Verify Contact Creation
    const person = await db
      .selectFrom('persons')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('email', '=', 'has-mobile@example.com')
      .executeTakeFirst();

    expect(person).toBeDefined();
    expect(person!.mobile).toBe('555-0000');
  });
});
