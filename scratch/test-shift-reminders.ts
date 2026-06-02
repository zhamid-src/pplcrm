// Scratch script to test volunteer shift reminders
import { VolunteerEventsController } from '../apps/backend/src/app/modules/volunteer-events/controller';
import { sql } from 'kysely';

async function runTest() {
  console.log('--- Starting Volunteer Shift Reminders Integration Test ---');
  const ctrl = new VolunteerEventsController();
  const db = (ctrl as any).getRepo().db;

  const tenantId = '1';
  let eventId: string | null = null;
  let testPersonId: string | null = null;

  try {
    // 1. Create an event 48 hours from now with send_reminder = true
    console.log('1. Creating volunteer event starting in 48 hours with reminders enabled...');
    const startTime = new Date(Date.now() + 48 * 3600 * 1000);
    const endTime = new Date(startTime.getTime() + 2 * 3600 * 1000); // 2 hours duration

    const event = await db.insertInto('volunteer_events')
      .values({
        tenant_id: tenantId,
        createdby_id: '1',
        updatedby_id: '1',
        name: '48 Hour Future Test Event',
        start_time: startTime,
        end_time: endTime,
        is_private: false,
        send_reminder: true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    eventId = String(event.id);
    console.log(`Created event ID: ${eventId}, Start: ${startTime.toISOString()}`);

    // 2. Sign up a volunteer publicly
    console.log('2. Signing up volunteer publicly...');
    const signupResult = await ctrl.signupVolunteerPublic(eventId, {
      first_name: 'Jane',
      last_name: 'Reminder',
      email: 'jane.reminder@example.com',
      mobile: '555-5555',
      notes: 'Testing reminders!',
    }, '127.0.0.1');

    console.log('Signup result:', signupResult);

    // Get the person ID
    const person = await db.selectFrom('persons')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where('email', '=', 'jane.reminder@example.com')
      .executeTakeFirstOrThrow();
    testPersonId = String(person.id);

    // Get the shift details
    const shift = await db.selectFrom('volunteer_shifts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('event_id', '=', eventId as any)
      .where('person_id', '=', testPersonId as any)
      .executeTakeFirstOrThrow();

    // 3. Verify send-shift-reminder job is queued with correct run_at delay
    console.log('3. Verifying send-shift-reminder job is queued...');
    let job = await db.selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'send-shift-reminder')
      .where(sql`payload->>'shiftId'`, '=', String(shift.id))
      .executeTakeFirst();

    if (!job) {
      throw new Error('Verification failed: send-shift-reminder job was not queued.');
    }

    const expectedRunAt = new Date(startTime.getTime() - 24 * 3600 * 1000);
    const actualRunAt = new Date(job.run_at);
    
    // Check if run_at matches within 5 seconds
    const diffSeconds = Math.abs(expectedRunAt.getTime() - actualRunAt.getTime()) / 1000;
    console.log(`Job scheduled run_at: ${actualRunAt.toISOString()}, Expected: ${expectedRunAt.toISOString()}`);
    if (diffSeconds > 5) {
      throw new Error(`Verification failed: Expected run_at to be ${expectedRunAt.toISOString()} but got ${actualRunAt.toISOString()}`);
    }
    console.log('Verified: Job queued with correct 24-hour lead delay!');

    // 4. Test Shift Cancel (updateStatus to 'cancelled')
    console.log('4. Testing cancellation of shift (updates status to cancelled)...');
    await ctrl.updateShift(String(shift.id), { status: 'cancelled' }, { tenant_id: tenantId, user_id: '1', role: 'admin' });

    // Verify job is deleted
    let cancelledJob = await db.selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'send-shift-reminder')
      .where(sql`payload->>'shiftId'`, '=', String(shift.id))
      .executeTakeFirst();

    if (cancelledJob) {
      throw new Error('Verification failed: pending shift reminder was not deleted on cancellation.');
    }
    console.log('Verified: Pending shift reminder was deleted on cancellation.');

    // 5. Update shift status back to 'signed_up' and verify job is re-scheduled
    console.log('5. Re-scheduling shift by updating status back to signed_up...');
    await ctrl.updateShift(String(shift.id), { status: 'signed_up' }, { tenant_id: tenantId, user_id: '1', role: 'admin' });

    // Verify job is back
    job = await db.selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'send-shift-reminder')
      .where(sql`payload->>'shiftId'`, '=', String(shift.id))
      .executeTakeFirst();

    if (!job) {
      throw new Error('Verification failed: shift reminder was not re-queued.');
    }
    console.log('Verified: Shift reminder was successfully re-queued.');

    // 6. Test Event Update turning reminders off
    console.log('6. Disabling reminders on event detail view (turning reminders off)...');
    await ctrl.updateEvent(eventId, { send_reminder: false }, { tenant_id: tenantId, user_id: '1', role: 'admin' });

    // Verify job is deleted
    let disabledJob = await db.selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'send-shift-reminder')
      .where(sql`payload->>'eventId'`, '=', eventId)
      .executeTakeFirst();

    if (disabledJob) {
      throw new Error('Verification failed: pending shift reminders were not cleared when reminders were disabled for event.');
    }
    console.log('Verified: Pending shift reminders were cleared when event reminders were disabled.');

    // 7. Test Event Update turning reminders back on
    console.log('7. Re-enabling reminders on event detail view...');
    await ctrl.updateEvent(eventId, { send_reminder: true }, { tenant_id: tenantId, user_id: '1', role: 'admin' });

    // Verify job is back
    job = await db.selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'send-shift-reminder')
      .where(sql`payload->>'shiftId'`, '=', String(shift.id))
      .executeTakeFirst();

    if (!job) {
      throw new Error('Verification failed: shift reminder was not re-queued when event reminders were re-enabled.');
    }
    console.log('Verified: Shift reminder was successfully re-queued when event reminders were re-enabled.');

    // 8. Run BackgroundJobWorker to process the reminder email
    console.log('8. Simulating time passing: updating job run_at to past so worker picks it up...');
    await db.updateTable('background_jobs')
      .set({ run_at: new Date(Date.now() - 1000) })
      .where('id', '=', job.id)
      .execute();

    const { BackgroundJobWorker } = await import('../apps/backend/src/app/lib/jobs/worker');
    const worker = new BackgroundJobWorker();
    console.log('Running background job worker to process the shift reminder...');
    await (worker as any).processNextJob();
    console.log('Background job worker run complete.');

    // Verify the job was completed in the DB
    const processedJob = await db.selectFrom('background_jobs')
      .select(['status', 'error'])
      .where('id', '=', job.id)
      .executeTakeFirst();
    if (!processedJob || processedJob.status !== 'completed') {
      throw new Error(`Verification failed: Background job processing failed. Status: ${processedJob?.status}, Error: ${processedJob?.error}`);
    }
    console.log('Verified: Job marked as completed in DB.');

    // 9. Verify that a deleted shift removes any reminders
    console.log('9. Re-scheduling a new shift reminder by deleting shift and recreating...');
    // Delete test job
    await db.deleteFrom('background_jobs').where('id', '=', job.id).execute();
    
    // Reset shift status back to cancelled first
    await ctrl.updateShift(String(shift.id), { status: 'cancelled' }, { tenant_id: tenantId, user_id: '1', role: 'admin' });
    // Change to signed_up to queue a new reminder
    await ctrl.updateShift(String(shift.id), { status: 'signed_up' }, { tenant_id: tenantId, user_id: '1', role: 'admin' });
    
    // Verify job is back
    const freshJob = await db.selectFrom('background_jobs')
      .select('id')
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'send-shift-reminder')
      .where(sql`payload->>'shiftId'`, '=', String(shift.id))
      .executeTakeFirst();
    if (!freshJob) {
      throw new Error('Fresh job not queued.');
    }

    console.log('Deleting shift completely...');
    await ctrl.deleteShift(String(shift.id), { tenant_id: tenantId, user_id: '1', role: 'admin' });
    
    // Verify job is deleted
    const deletedShiftJob = await db.selectFrom('background_jobs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where(sql`payload->>'type'`, '=', 'send-shift-reminder')
      .where(sql`payload->>'shiftId'`, '=', String(shift.id))
      .executeTakeFirst();
    if (deletedShiftJob) {
      throw new Error('Verification failed: shift reminder job was not deleted when the shift was deleted.');
    }
    console.log('Verified: Pending shift reminder was deleted when shift was deleted.');

    console.log('🎉 Volunteer Shift Reminders Integration Test passed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    console.log('Cleaning up test data...');
    if (eventId) {
      await db.deleteFrom('background_jobs')
        .where('tenant_id', '=', tenantId)
        .where(sql`payload->>'eventId'`, '=', eventId)
        .execute();
      
      await db.deleteFrom('volunteer_shifts')
        .where('tenant_id', '=', tenantId)
        .where('event_id', '=', eventId as any)
        .execute();

      await db.deleteFrom('volunteer_events')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', eventId as any)
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
