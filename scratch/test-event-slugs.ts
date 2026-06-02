// Scratch script to test volunteer event URL slugs
import { VolunteerEventsController } from '../apps/backend/src/app/modules/volunteer-events/controller';
import { sql } from 'kysely';
import { TRPCError } from '@trpc/server';

async function runTest() {
  console.log('--- Starting Volunteer Event URL Slugs Integration Test ---');
  const ctrl = new VolunteerEventsController();
  const db = (ctrl as any).getRepo().db;

  const tenantId = '1';
  let eventId1: string | null = null;
  let eventId2: string | null = null;
  let testPersonId: string | null = null;
  const testSlug = 'weekend-community-signup';

  try {
    // 1. Create a volunteer event with a custom slug
    console.log('1. Creating volunteer event with slug "weekend-community-signup"...');
    const startTime = new Date(Date.now() + 48 * 3600 * 1000);
    const endTime = new Date(startTime.getTime() + 2 * 3600 * 1000);

    const event1 = await ctrl.addEvent({
      name: 'Weekend Community knocking',
      description: 'Help knock doors',
      location_address: 'Main St',
      start_time: startTime,
      end_time: endTime,
      capacity: 10,
      contact_email: 'test@example.com',
      contact_phone: '555-5555',
      is_private: false,
      send_reminder: true,
      slug: testSlug,
    }, { tenant_id: tenantId, user_id: '1', role: 'admin' });

    eventId1 = String(event1.id);
    console.log(`Created event ID: ${eventId1}, Slug: ${event1.slug}`);

    if (event1.slug !== testSlug) {
      throw new Error(`Expected slug to be ${testSlug} but got ${event1.slug}`);
    }

    // 2. Try to create another event with the same slug (should throw TRPCError)
    console.log('2. Trying to create another event with the duplicate slug...');
    let didThrow = false;
    try {
      await ctrl.addEvent({
        name: 'Another Event',
        start_time: startTime,
        end_time: endTime,
        slug: testSlug,
      }, { tenant_id: tenantId, user_id: '1', role: 'admin' });
    } catch (err: any) {
      didThrow = true;
      if (!(err instanceof TRPCError) || err.code !== 'BAD_REQUEST' || !err.message.includes('already in use')) {
        throw new Error(`Expected BAD_REQUEST TRPCError with in-use message, but got: ${err}`);
      }
      console.log('Successfully blocked duplicate slug creation: ', err.message);
    }

    if (!didThrow) {
      throw new Error('Verification failed: Creating duplicate slug did not throw.');
    }

    // 3. Query getEventPublic by slug
    console.log('3. Querying event publicly by slug...');
    const eventBySlug = await ctrl.getEventPublic(testSlug);
    if (!eventBySlug || String(eventBySlug.id) !== eventId1) {
      throw new Error('Verification failed: Could not retrieve event by slug.');
    }
    console.log(`Successfully retrieved event by slug: ${eventBySlug.name}`);

    // 4. Query getEventPublic by sequential ID (backwards compatibility check)
    console.log('4. Querying event publicly by database sequential ID...');
    const eventById = await ctrl.getEventPublic(eventId1);
    if (!eventById || eventById.slug !== testSlug) {
      throw new Error('Verification failed: Could not retrieve event by sequential ID.');
    }
    console.log(`Successfully retrieved event by sequential ID: ${eventById.name}`);

    // 5. TRPC getOneById should map public_url using slug
    console.log('5. Verifying TRPC getOneById public_url mapping...');
    const oneById = await ctrl.getOneById({ tenant_id: tenantId, id: eventId1 });
    const expectedUrl = `/api/events/view/${testSlug}`;
    console.log(`Returned public_url: ${oneById.public_url}`);
    if (oneById.public_url !== expectedUrl) {
      throw new Error(`Verification failed: Expected public_url to be ${expectedUrl} but got ${oneById.public_url}`);
    }
    console.log('Verified: TRPC mapping successfully uses the URL slug!');

    // 6. Test public registration using slug as eventId parameter
    console.log('6. Testing public volunteer registration using slug...');
    const signupResult = await ctrl.signupVolunteerPublic(testSlug, {
      first_name: 'Slug',
      last_name: 'Tester',
      email: 'slug.tester@example.com',
    }, '127.0.0.1');

    console.log('Signup result:', signupResult);

    // Verify shift was inserted correctly
    const person = await db.selectFrom('persons')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('email', '=', 'slug.tester@example.com')
      .executeTakeFirstOrThrow();
    testPersonId = String(person.id);

    const shift = await db.selectFrom('volunteer_shifts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('event_id', '=', eventId1 as any)
      .where('person_id', '=', testPersonId as any)
      .executeTakeFirstOrThrow();
    
    console.log(`Shift successfully registered in DB: shift ID = ${shift.id}`);

    // 7. Test checkSlugUnique endpoint
    console.log('7. Testing checkSlugUnique endpoint...');
    const check1 = await ctrl.checkSlugUnique(testSlug, null, { tenant_id: tenantId, user_id: '1', role: 'admin' });
    if (check1.unique !== false) {
      throw new Error(`Expected checkSlugUnique to return unique: false for existing slug, but got: ${JSON.stringify(check1)}`);
    }
    const check2 = await ctrl.checkSlugUnique(testSlug, eventId1, { tenant_id: tenantId, user_id: '1', role: 'admin' });
    if (check2.unique !== true) {
      throw new Error(`Expected checkSlugUnique to return unique: true when excluding current event ID, but got: ${JSON.stringify(check2)}`);
    }
    const check3 = await ctrl.checkSlugUnique('non-existent-slug-xyz', null, { tenant_id: tenantId, user_id: '1', role: 'admin' });
    if (check3.unique !== true) {
      throw new Error(`Expected checkSlugUnique to return unique: true for non-existent slug, but got: ${JSON.stringify(check3)}`);
    }
    console.log('Successfully verified checkSlugUnique endpoint behavior!');

    console.log('🎉 Volunteer Event URL Slugs Integration Test passed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    console.log('Cleaning up test data...');
    if (eventId1) {
      await db.deleteFrom('background_jobs')
        .where('tenant_id', '=', tenantId)
        .where(sql`payload->>'eventId'`, '=', eventId1)
        .execute();
      
      await db.deleteFrom('volunteer_shifts')
        .where('tenant_id', '=', tenantId)
        .where('event_id', '=', eventId1 as any)
        .execute();

      await db.deleteFrom('volunteer_events')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', eventId1 as any)
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
