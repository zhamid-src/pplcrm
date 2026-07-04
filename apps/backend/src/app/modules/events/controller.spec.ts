import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { IAuthKeyPayload } from '@common';
import { EventsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';

const rand = (): string => String(Math.floor(Math.random() * 100000000) + 10000000);

async function createTestSeed(db: any) {
  const tenantId = rand();
  const userId = rand();
  const campaignId = rand();
  const householdId = rand();

  await db.insertInto('tenants').values({ id: tenantId, name: 'Events Test Tenant' }).execute();

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

  await db
    .updateTable('tenants')
    .set({ admin_id: userId, createdby_id: userId, placeholder_household_id: householdId })
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

  await db.deleteFrom('event_registrations').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('event_ticket_types').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('events').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('EventsController', () => {
  const controller = new EventsController();
  const db = (BaseRepository as any)._db;
  let tenantId: string;
  let userId: string;
  let campaignId: string;
  let householdId: string;
  let auth: IAuthKeyPayload;

  beforeEach(async () => {
    const seed = await createTestSeed(db);
    tenantId = seed.tenantId;
    userId = seed.userId;
    campaignId = seed.campaignId;
    householdId = seed.householdId;
    auth = { tenant_id: tenantId, user_id: userId, name: 'Test User', session_id: 'test-session' };
  });

  afterEach(async () => {
    await cleanTenant(db, tenantId);
  });

  function eventPayload(overrides: Record<string, unknown> = {}) {
    const now = Date.now();
    return {
      name: 'Community Fair',
      slug: `community-fair-${rand()}`,
      start_time: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(now + 26 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    };
  }

  it('creates an event with default fields', async () => {
    const payload = eventPayload();
    const event = await controller.addEvent(payload, auth);

    expect(event).toBeDefined();
    expect(event.name).toBe('Community Fair');
    expect(event.slug).toBe(payload.slug);
    expect(event.is_published).toBe(false);
    expect(event.fields).toEqual(['first_name', 'last_name', 'email', 'mobile', 'notes']);
  });

  it('rejects creating an event with a duplicate slug', async () => {
    const payload = eventPayload();
    await controller.addEvent(payload, auth);

    await expect(controller.addEvent(eventPayload({ slug: payload.slug }), auth)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('rejects creating an event whose end time is before its start time', async () => {
    const now = Date.now();
    const payload = eventPayload({
      start_time: new Date(now + 26 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    });

    await expect(controller.addEvent(payload, auth)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('checks slug uniqueness, excluding the current event id when updating', async () => {
    const event = await controller.addEvent(eventPayload(), auth);

    const takenResult = await controller.checkSlugUnique(event.slug, null, auth);
    expect(takenResult.unique).toBe(false);

    const selfExcludedResult = await controller.checkSlugUnique(event.slug, String(event.id), auth);
    expect(selfExcludedResult.unique).toBe(true);

    const freeResult = await controller.checkSlugUnique(`free-slug-${rand()}`, null, auth);
    expect(freeResult.unique).toBe(true);
  });

  it('updates an event and rejects a duplicate slug on update', async () => {
    const eventA = await controller.addEvent(eventPayload(), auth);
    const eventB = await controller.addEvent(eventPayload(), auth);

    const updated = await controller.updateEvent(String(eventA.id), { name: 'Updated Name' }, auth);
    expect(updated?.name).toBe('Updated Name');

    await expect(controller.updateEvent(String(eventB.id), { slug: eventA.slug }, auth)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('rejects updating an event so its end time precedes its start time', async () => {
    const event = await controller.addEvent(eventPayload(), auth);
    const now = Date.now();

    await expect(
      controller.updateEvent(
        String(event.id),
        {
          start_time: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(now + 1 * 60 * 60 * 1000).toISOString(),
        },
        auth,
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('lists events with registration counts', async () => {
    await controller.addEvent(eventPayload(), auth);
    await controller.addEvent(eventPayload(), auth);

    const result = await controller.getAllEvents(auth, {});
    expect(result.count).toBeGreaterThanOrEqual(2);
    expect(result.rows.every((r: any) => 'registrations_count' in r)).toBe(true);
  });

  it('manages ticket types for an event', async () => {
    const event = await controller.addEvent(eventPayload(), auth);

    const ticketType = await controller.addTicketType(
      { event_id: String(event.id), name: 'General', price_cents: 1000, capacity: 2 },
      auth,
    );
    expect(ticketType).toBeDefined();

    const list = await controller.getTicketTypesForEvent(String(event.id), auth);
    expect(list).toHaveLength(1);

    const updated = await controller.updateTicketType(String(ticketType.id), { name: 'VIP' }, auth);
    expect(updated?.name).toBe('VIP');

    const deleted = await controller.deleteTicketType(String(ticketType.id), auth);
    expect(deleted).toBe(true);

    const listAfterDelete = await controller.getTicketTypesForEvent(String(event.id), auth);
    expect(listAfterDelete).toHaveLength(0);
  });

  it('adds a person, registers them, checks them in, and cleans up on delete', async () => {
    const event = await controller.addEvent(eventPayload({ capacity: 1 }), auth);

    const personId = rand();
    await db
      .insertInto('persons')
      .values({
        id: personId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Reggie',
        last_name: 'Strant',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    const registration = await controller.addRegistration({ event_id: String(event.id), person_id: personId }, auth);
    expect(registration?.status).toBe('registered');

    // Capacity is 1 and already full -> a second registration must fail
    const personId2 = rand();
    await db
      .insertInto('persons')
      .values({
        id: personId2,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Second',
        last_name: 'Person',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();
    await expect(
      controller.addRegistration({ event_id: String(event.id), person_id: personId2 }, auth),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const checkedIn = await controller.checkIn(String(registration.id), auth);
    expect(checkedIn?.status).toBe('attended');

    const updatedReg = await controller.updateRegistration(String(registration.id), { notes: 'VIP guest' }, auth);
    expect(updatedReg?.notes).toBe('VIP guest');

    const registrations = await controller.getRegistrationsForEvent(String(event.id), auth);
    expect(registrations).toHaveLength(1);

    const deleted = await controller.deleteRegistration(String(registration.id), auth);
    expect(deleted).toBe(true);
  });

  it('rejects registration for a non-existent event', async () => {
    const personId = rand();
    await db
      .insertInto('persons')
      .values({
        id: personId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Nobody',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    await expect(
      controller.addRegistration({ event_id: '999999999', person_id: personId }, auth),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('reports history and stats for a person', async () => {
    const event = await controller.addEvent(eventPayload(), auth);
    const personId = rand();
    await db
      .insertInto('persons')
      .values({
        id: personId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'History',
        last_name: 'Person',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    const registration = await controller.addRegistration({ event_id: String(event.id), person_id: personId }, auth);
    await controller.checkIn(String(registration.id), auth);

    const history = await controller.getHistoryForPerson(personId, auth);
    expect(history).toHaveLength(1);

    const stats = await controller.getEventStats(personId, auth);
    expect(stats.events_count).toBe(1);
  });

  describe('rsvpPublic', () => {
    it('registers a new public RSVP for a published event', async () => {
      const event = await controller.addEvent(eventPayload({ is_published: true }), auth);
      const ip = `10.0.0.${rand().slice(-2)}`;

      const result = await controller.rsvpPublic(
        event.slug,
        { email: `rsvp-${rand()}@example.com`, first_name: 'Rae', last_name: 'Svp' },
        ip,
      );

      expect(result).toEqual({ success: true });

      const personRow = await db
        .selectFrom('persons')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('first_name', '=', 'Rae')
        .executeTakeFirst();
      expect(personRow).toBeDefined();

      const regRow = await db
        .selectFrom('event_registrations')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('event_id', '=', event.id)
        .executeTakeFirst();
      expect(regRow).toBeDefined();
    });

    it('rejects RSVP for an unpublished/unknown slug', async () => {
      await controller.addEvent(eventPayload({ is_published: false }), auth);
      const ip = `10.0.1.${rand().slice(-2)}`;

      await expect(controller.rsvpPublic('non-existent-slug', { email: 'x@example.com' }, ip)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('rejects an RSVP that is missing an email address', async () => {
      const event = await controller.addEvent(eventPayload({ is_published: true }), auth);
      const ip = `10.0.2.${rand().slice(-2)}`;

      await expect(controller.rsvpPublic(event.slug, {}, ip)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('silently succeeds when the honeypot field is filled', async () => {
      const event = await controller.addEvent(eventPayload({ is_published: true }), auth);
      const ip = `10.0.3.${rand().slice(-2)}`;

      const result = await controller.rsvpPublic(event.slug, { email: 'bot@example.com', _hp: 'i-am-a-bot' }, ip);
      expect(result).toEqual({ success: true });

      const personRow = await db
        .selectFrom('persons')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('email', '=', 'bot@example.com')
        .executeTakeFirst();
      expect(personRow).toBeUndefined();
    });

    it('rejects duplicate RSVP registrations for the same person', async () => {
      const event = await controller.addEvent(eventPayload({ is_published: true }), auth);
      const ip = `10.0.4.${rand().slice(-2)}`;
      const email = `dup-${rand()}@example.com`;

      await controller.rsvpPublic(event.slug, { email, first_name: 'Dup' }, ip);
      await expect(controller.rsvpPublic(event.slug, { email, first_name: 'Dup' }, ip + '-b')).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('rate-limits repeated RSVP attempts from the same IP', async () => {
      const event = await controller.addEvent(eventPayload({ is_published: true }), auth);
      const ip = `10.0.5.${rand()}`;

      for (let i = 0; i < 5; i++) {
        await controller.rsvpPublic(event.slug, { email: `limit-${i}-${rand()}@example.com` }, ip).catch(() => {
          /* capacity/other errors are fine, we only care about the 6th call */
        });
      }

      await expect(
        controller.rsvpPublic(event.slug, { email: `limit-final-${rand()}@example.com` }, ip),
      ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
    });
  });

  it('propagates unexpected non-TRPC errors from addEvent', async () => {
    const payload = eventPayload({ name: null });

    await expect(controller.addEvent(payload as any, auth)).rejects.toBeInstanceOf(Error);
  });
});
