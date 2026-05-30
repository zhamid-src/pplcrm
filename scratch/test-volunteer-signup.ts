// Scratch script to test public volunteer signup with contact info, privacy, and secure slugs
import { VolunteerEventsController } from '../apps/backend/src/app/modules/volunteer-events/controller';
import { sql } from 'kysely';

async function runTest() {
  console.log('--- Starting Volunteer Signup Integration Test (V2) ---');
  const ctrl = new VolunteerEventsController();
  const db = (ctrl as any).getRepo().db;

  const tenantId = '1';
  let publicEventId: string | null = null;
  let privateEventId: string | null = null;
  let testPersonId: string | null = null;

  try {
    // 1. Resolve secure slug and check lookup
    const secureSlug = ctrl.getTenantSlug(tenantId);
    console.log(`Computed secure slug for tenant ${tenantId}: ${secureSlug}`);
    
    const matchedTenant = await ctrl.getTenantFromSlug(secureSlug);
    if (!matchedTenant || String(matchedTenant.id) !== tenantId) {
      throw new Error('Tenant lookup by secure slug failed.');
    }
    console.log(`Successfully verified tenant slug lookup: ${matchedTenant.name}`);

    // 2. Create a mock public event
    console.log('Inserting mock public event...');
    const publicEvent = await db.insertInto('volunteer_events')
      .values({
        tenant_id: tenantId,
        createdby_id: '1',
        updatedby_id: '1',
        name: 'Public Test Event',
        start_time: new Date(),
        end_time: new Date(Date.now() + 4 * 3600 * 1000),
        contact_email: 'organizer@test.com',
        contact_phone: '555-1234',
        is_private: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    publicEventId = String(publicEvent.id);

    // 3. Create a mock private event
    console.log('Inserting mock private event...');
    const privateEvent = await db.insertInto('volunteer_events')
      .values({
        tenant_id: tenantId,
        createdby_id: '1',
        updatedby_id: '1',
        name: 'Secret Private Event',
        start_time: new Date(),
        end_time: new Date(Date.now() + 4 * 3600 * 1000),
        contact_email: 'secret@test.com',
        contact_phone: '555-9999',
        is_private: true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    privateEventId = String(privateEvent.id);

    // 4. Test public listing endpoint
    console.log('Checking public events list...');
    const upcomingEvents = await ctrl.getUpcomingEventsPublic(tenantId);
    const eventIds = upcomingEvents.map((e: any) => String(e.id));
    console.log('Upcoming public events list IDs:', eventIds);

    if (!eventIds.includes(publicEventId)) {
      throw new Error('Verification failed: Public event is missing from the public listing.');
    }
    if (eventIds.includes(privateEventId)) {
      throw new Error('Verification failed: Private event was shown in the public listing.');
    }
    console.log('Verified: Private events are correctly excluded from listings.');

    // 5. Test direct view URL access
    console.log('Checking direct detail query for private event...');
    const directEventDetail = await ctrl.getEventPublic(privateEventId);
    if (!directEventDetail || directEventDetail.name !== 'Secret Private Event') {
      throw new Error('Verification failed: Direct access to private event failed.');
    }
    if (directEventDetail.contact_email !== 'secret@test.com' || directEventDetail.contact_phone !== '555-9999') {
      throw new Error('Verification failed: Organizer contact point values do not match.');
    }
    console.log('Verified: Private event details and contact points are accessible via direct lookup.');

    // 6. Test tRPC getById override mapping (url mapping check)
    console.log('Checking tRPC getById URL mapping...');
    const trpcDetail = await ctrl.getOneById({ tenant_id: tenantId, id: publicEventId });
    if (!trpcDetail || !trpcDetail.public_url || !trpcDetail.tenant_public_url) {
      throw new Error('Verification failed: public_url or tenant_public_url missing from override.');
    }
    console.log('Override relative public URL:', trpcDetail.public_url);
    console.log('Override relative tenant URL:', trpcDetail.tenant_public_url);

    // 7. Test public registration
    console.log('Testing signup on private event...');
    const signupResult = await ctrl.signupVolunteerPublic(privateEventId, {
      first_name: 'Bob',
      last_name: 'Volunteer',
      email: 'bob.volunteer@example.com',
      mobile: '555-4321',
      notes: 'Happy to help on this private project.',
    }, '127.0.0.1');
    console.log('Signup result:', signupResult);

    // Check DB
    const person = await db.selectFrom('persons')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('email', '=', 'bob.volunteer@example.com')
      .executeTakeFirst();
    if (!person) {
      throw new Error('Person record not found after signup.');
    }
    testPersonId = String(person.id);

    console.log('🎉 V2 Integration test completed successfully!');

  } catch (error) {
    console.error('❌ V2 Test failed with error:', error);
  } finally {
    console.log('Cleaning up test data...');
    if (publicEventId) {
      await db.deleteFrom('volunteer_events')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', publicEventId as any)
        .execute();
    }
    if (privateEventId) {
      await db.deleteFrom('volunteer_shifts')
        .where('tenant_id', '=', tenantId)
        .where('event_id', '=', privateEventId as any)
        .execute();
      await db.deleteFrom('volunteer_events')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', privateEventId as any)
        .execute();
    }
    if (testPersonId) {
      await db.deleteFrom('map_peoples_tags')
        .where('tenant_id', '=', tenantId)
        .where('person_id', '=', testPersonId as any)
        .execute();
      await db.deleteFrom('persons')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', testPersonId as any)
        .execute();
    }
    console.log('Cleanup finished.');
  }
}

runTest();
