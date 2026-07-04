import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { IAuthKeyPayload } from '@common';
import { VolunteerEventsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';

const rand = (): string => String(Math.floor(Math.random() * 100000000) + 10000000);

async function createTestSeed(db: any) {
  const tenantId = rand();
  const userId = rand();
  const campaignId = rand();
  const householdId = rand();

  await db.insertInto('tenants').values({ id: tenantId, name: 'Volunteer Events Test Tenant' }).execute();

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

  await db.deleteFrom('volunteer_shifts').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('volunteer_events').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('background_jobs').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('user_activity').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('map_peoples_tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tags').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('persons').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('households').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('campaigns').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('authusers').where('tenant_id', '=', tenantId).execute();
  await db.deleteFrom('tenants').where('id', '=', tenantId).execute();
}

describe('VolunteerEventsController', () => {
  const controller = new VolunteerEventsController();
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
      name: 'Park Cleanup',
      slug: `park-cleanup-${rand()}`,
      start_time: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(now + 26 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    };
  }

  it('creates a volunteer event with default fields', async () => {
    const payload = eventPayload();
    const event = await controller.addEvent(payload, auth);

    expect(event).toBeDefined();
    expect(event.name).toBe('Park Cleanup');
    expect(event.is_private).toBe(false);
    expect(event.fields).toEqual(['first_name', 'last_name', 'email', 'mobile', 'notes']);
  });

  it('rejects creating a volunteer event with a duplicate slug', async () => {
    const payload = eventPayload();
    await controller.addEvent(payload, auth);

    await expect(controller.addEvent(eventPayload({ slug: payload.slug }), auth)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('rejects creating a volunteer event whose end time precedes its start time', async () => {
    const now = Date.now();
    await expect(
      controller.addEvent(
        eventPayload({
          start_time: new Date(now + 26 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        }),
        auth,
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('checks slug uniqueness excluding the current event id', async () => {
    const event = await controller.addEvent(eventPayload(), auth);

    expect((await controller.checkSlugUnique(event.slug, null, auth)).unique).toBe(false);
    expect((await controller.checkSlugUnique(event.slug, String(event.id), auth)).unique).toBe(true);
    expect((await controller.checkSlugUnique(`free-${rand()}`, null, auth)).unique).toBe(true);
  });

  it('updates an event and rejects duplicate slug on update', async () => {
    const eventA = await controller.addEvent(eventPayload(), auth);
    const eventB = await controller.addEvent(eventPayload(), auth);

    const updated = await controller.updateEvent(String(eventA.id), { name: 'Renamed' }, auth);
    expect(updated?.name).toBe('Renamed');

    await expect(controller.updateEvent(String(eventB.id), { slug: eventA.slug }, auth)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('returns a decorated event with public URLs via getOneById', async () => {
    const event = await controller.addEvent(eventPayload(), auth);

    const fetched: any = await controller.getOneById({ tenant_id: tenantId, id: String(event.id) });
    expect(fetched.public_url).toBe(`/api/events/view/${event.slug}`);
    expect(fetched.tenant_public_url).toContain('/api/events/org/');
  });

  it('signs up a volunteer for a shift, updates it, and prevents duplicate signups', async () => {
    const event = await controller.addEvent(eventPayload(), auth);
    const personId = rand();
    await db
      .insertInto('persons')
      .values({
        id: personId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Vera',
        last_name: 'Lunteer',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    const shift = await controller.signupVolunteer({ event_id: String(event.id), person_id: personId }, auth);
    expect(shift?.status).toBe('signed_up');

    await expect(controller.signupVolunteer({ event_id: String(event.id), person_id: personId }, auth)).rejects.toThrow(
      'already signed up',
    );

    const updated = await controller.updateShift(String(shift.id), { status: 'attended' }, auth);
    expect(updated?.status).toBe('attended');

    const shifts = await controller.getShiftsForEvent(String(event.id), auth);
    expect(shifts).toHaveLength(1);

    const deleted = await controller.deleteShift(String(shift.id), auth);
    expect(deleted).toBe(true);
  });

  it('reports volunteer history and stats for a person', async () => {
    const event = await controller.addEvent(eventPayload(), auth);
    const personId = rand();
    await db
      .insertInto('persons')
      .values({
        id: personId,
        tenant_id: tenantId,
        campaign_id: campaignId,
        household_id: householdId,
        first_name: 'Statty',
        createdby_id: userId,
        updatedby_id: userId,
      })
      .execute();

    const shift = await controller.signupVolunteer(
      { event_id: String(event.id), person_id: personId, hours_worked: 3 },
      auth,
    );
    await controller.updateShift(String(shift.id), { status: 'attended' }, auth);

    const history = await controller.getHistoryForPerson(personId, auth);
    expect(history).toHaveLength(1);

    const stats = await controller.getVolunteerStats(personId, auth);
    expect(stats.shifts_count).toBe(1);
    expect(stats.total_hours).toBeCloseTo(3);
  });

  it('exposes public tenant info, upcoming events, and event-by-slug lookups', async () => {
    const publicEvent = await controller.addEvent(eventPayload({ is_private: false }), auth);
    await controller.addEvent(eventPayload({ is_private: true }), auth);

    const tenantPublic = await controller.getTenantPublic(tenantId);
    expect(tenantPublic?.name).toBe('Volunteer Events Test Tenant');

    const upcoming = await controller.getUpcomingEventsPublic(tenantId);
    expect(upcoming).toHaveLength(1);
    expect(String(upcoming[0].id)).toBe(String(publicEvent.id));

    const bySlug = await controller.getEventPublic(publicEvent.slug);
    expect(bySlug?.id).toBe(publicEvent.id);

    const byId = await controller.getEventPublic(String(publicEvent.id));
    expect(byId?.id).toBe(publicEvent.id);

    const slug = controller.getTenantSlug(tenantId);
    const resolvedTenant = await controller.getTenantFromSlug(slug);
    expect(resolvedTenant?.id).toBe(tenantId);
  });

  describe('signupVolunteerPublic', () => {
    it('signs up a new volunteer, tags them, and queues notification jobs', async () => {
      const event = await controller.addEvent(eventPayload(), auth);
      const ip = `10.1.0.${rand().slice(-2)}`;
      const email = `public-${rand()}@example.com`;

      const result = await controller.signupVolunteerPublic(
        String(event.id),
        { email, first_name: 'Pub', last_name: 'Lic' },
        ip,
      );
      expect(result).toEqual({ success: true });

      const person = await db
        .selectFrom('persons')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('email', '=', email)
        .executeTakeFirst();
      expect(person).toBeDefined();

      const shift = await db
        .selectFrom('volunteer_shifts')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('event_id', '=', event.id)
        .where('person_id', '=', person.id)
        .executeTakeFirst();
      expect(shift).toBeDefined();

      const tags = await db
        .selectFrom('tags')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('name', 'in', ['volunteer', `event: ${event.name}`.toLowerCase()])
        .execute();
      expect(tags.length).toBeGreaterThanOrEqual(2);

      const job = await db
        .selectFrom('background_jobs')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      expect(job).toBeDefined();
    });

    it('rejects a signup for a non-existent event', async () => {
      const ip = `10.1.1.${rand().slice(-2)}`;
      await expect(controller.signupVolunteerPublic('999999999', { email: 'x@example.com' }, ip)).rejects.toMatchObject(
        { code: 'NOT_FOUND' },
      );
    });

    it('rejects a signup missing an email address', async () => {
      const event = await controller.addEvent(eventPayload(), auth);
      const ip = `10.1.2.${rand().slice(-2)}`;

      await expect(controller.signupVolunteerPublic(String(event.id), {}, ip)).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('silently succeeds when the honeypot field is filled', async () => {
      const event = await controller.addEvent(eventPayload(), auth);
      const ip = `10.1.3.${rand().slice(-2)}`;

      const result = await controller.signupVolunteerPublic(
        String(event.id),
        { email: 'bot@example.com', _hp: 'spam' },
        ip,
      );
      expect(result).toEqual({ success: true });

      const person = await db
        .selectFrom('persons')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('email', '=', 'bot@example.com')
        .executeTakeFirst();
      expect(person).toBeUndefined();
    });

    it('rejects a signup once the event is at capacity', async () => {
      const event = await controller.addEvent(eventPayload({ capacity: 0 }), auth);
      const ip = `10.1.4.${rand().slice(-2)}`;

      await expect(
        controller.signupVolunteerPublic(String(event.id), { email: 'full@example.com' }, ip),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('rate-limits repeated public signups from the same IP', async () => {
      const event = await controller.addEvent(eventPayload(), auth);
      const ip = `10.1.5.${rand()}`;

      for (let i = 0; i < 5; i++) {
        await controller
          .signupVolunteerPublic(String(event.id), { email: `rl-${i}-${rand()}@example.com` }, ip)
          .catch(() => {
            /* only the 6th call matters for this assertion */
          });
      }

      await expect(
        controller.signupVolunteerPublic(String(event.id), { email: `rl-final-${rand()}@example.com` }, ip),
      ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
    });
  });
});
