// Scratch script to test drip campaigns automated workflows
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables before importing anything else
function loadEnv() {
  const envFiles = ['.env.development', '.env'];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let value = trimmed.substring(index + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

loadEnv();

import { sql } from 'kysely';

async function runTest() {
  console.log('--- Starting Automated Follow-up Workflows Integration Test ---');
  const { WorkflowsController } = await import('../apps/backend/src/app/modules/workflows/controller');
  const ctrl = new WorkflowsController();
  const db = (ctrl as any).getRepo().db;

  const tenantId = '1';
  let workflowId: string | null = null;
  let testPersonId: string | null = null;
  let enrollmentId: string | null = null;


  try {
    // 1. Create a test contact
    console.log('1. Querying tenant settings & creating test contact...');
    const tenantRow = await db.selectFrom('tenants')
      .select(['placeholder_household_id', 'admin_id'])
      .where('id', '=', tenantId as any)
      .executeTakeFirstOrThrow();
      
    const campaignRow = await db.selectFrom('campaigns')
      .select('id')
      .where('tenant_id', '=', tenantId as any)
      .limit(1)
      .executeTakeFirst();
    const campaignId = campaignRow ? String(campaignRow.id) : '1';
    const actorId = tenantRow.admin_id || '1';

    const person = await db.insertInto('persons')
      .values({
        tenant_id: tenantId,
        campaign_id: campaignId as any,
        household_id: String(tenantRow.placeholder_household_id) as any,
        createdby_id: actorId as any,
        updatedby_id: actorId as any,
        first_name: 'Drip',
        last_name: 'Tester',
        email: 'drip.tester@example.com',
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    testPersonId = String(person.id);
    console.log(`Created person ID: ${testPersonId}`);

    // 2. Create an active automated workflow
    console.log('2. Creating active automated workflow...');
    const workflow = await db.insertInto('workflows')
      .values({
        tenant_id: tenantId,
        name: 'Volunteer Onboarding Sequence',
        description: 'Test volunteer welcome drip sequence.',
        trigger_type: 'volunteer_signup',
        status: 'active',
        createdby_id: '1',
        updatedby_id: '1',
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    workflowId = String(workflow.id);
    console.log(`Created workflow ID: ${workflowId}`);

    // 3. Define 2 steps for the workflow
    console.log('3. Defining steps for the workflow...');
    const stepsPayload = [
      {
        delay_days: 0, // instant
        subject: 'Welcome to the team!',
        preview_text: 'Thank you for signing up to volunteer',
        html_content: '<p>Hi Drip,</p><p>We are excited to have you on board!</p>',
        plain_text_content: 'Hi Drip,\n\nWe are excited to have you on board!',
      },
      {
        delay_days: 3,
        subject: 'Join our communication channel',
        preview_text: 'Stay connected with other volunteers',
        html_content: '<p>Hi Drip,</p><p>Please join our WhatsApp group!</p>',
        plain_text_content: 'Hi Drip,\n\nPlease join our WhatsApp group!',
      }
    ];
    await ctrl.saveSteps(tenantId, workflowId, stepsPayload, '1');
    console.log('Saved steps successfully.');

    // 4. Trigger the volunteer signup trigger programmatically (simulates shift signup)
    console.log('4. Simulating volunteer signup trigger...');
    await db.transaction().execute(async (trx) => {
      await ctrl.triggerVolunteerSignup(tenantId, testPersonId!, null, trx);
    });

    // 5. Verify enrollment was created
    console.log('5. Verifying active enrollment...');
    const enrollment = await db.selectFrom('workflow_enrollments')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('workflow_id', '=', workflowId as any)
      .where('person_id', '=', testPersonId as any)
      .executeTakeFirstOrThrow();
    
    enrollmentId = String(enrollment.id);
    console.log(`Verified: Enrollment created with ID ${enrollmentId}. Status: ${enrollment.status}, Current Step: ${enrollment.current_step_number}`);
    if (enrollment.status !== 'active' || enrollment.current_step_number !== 1) {
      throw new Error(`Verification failed: Expected active status and step 1, got status ${enrollment.status} and step ${enrollment.current_step_number}`);
    }

    // 6. Simulate BackgroundJobWorker executing the step run
    console.log('6. Processing drip workflows background job...');
    // We run executeJob for 'process_drip_workflows' directly to simulate the worker cycle
    const { executeJob } = await import('../apps/backend/src/app/lib/jobs/job-handlers');
    await executeJob({ type: 'process_drip_workflows' }, db);

    // Verify enrollment has moved to Step 2
    console.log('7. Verifying step 1 execution...');
    let updatedEnrollment = await db.selectFrom('workflow_enrollments')
      .selectAll()
      .where('id', '=', enrollmentId as any)
      .executeTakeFirstOrThrow();

    console.log(`Enrollment status: ${updatedEnrollment.status}, Current Step: ${updatedEnrollment.current_step_number}`);
    if (updatedEnrollment.status !== 'active' || updatedEnrollment.current_step_number !== 2) {
      throw new Error(`Verification failed: Expected enrollment to transition to step 2, got step ${updatedEnrollment.current_step_number}`);
    }
    console.log('Verified: Enrollment transitioned to step 2.');

    // Verify that the email send was logged in user_activity
    const activity = await db.selectFrom('user_activity')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('activity', '=', 'send')
      .where('entity', '=', 'workflows')
      .where('entity_id', '=', workflowId)
      .executeTakeFirst();
    if (!activity) {
      throw new Error('Verification failed: Email send activity was not logged.');
    }
    console.log('Verified: Email send activity was logged in user_activity.');

    // 8. Simulate time passing for Step 2 (update run_at to past)
    console.log('8. Simulating 3 days passing (updating next_run_at to past)...');
    await db.updateTable('workflow_enrollments')
      .set({ next_run_at: new Date(Date.now() - 1000) })
      .where('id', '=', enrollmentId as any)
      .execute();

    // 9. Run background job again
    console.log('9. Processing step 2 background job...');
    await executeJob({ type: 'process_drip_workflows' }, db);

    // Verify enrollment is marked completed
    console.log('10. Verifying step 2 execution & completion...');
    updatedEnrollment = await db.selectFrom('workflow_enrollments')
      .selectAll()
      .where('id', '=', enrollmentId as any)
      .executeTakeFirstOrThrow();

    console.log(`Enrollment status: ${updatedEnrollment.status}, Next Run At: ${updatedEnrollment.next_run_at}`);
    if (updatedEnrollment.status !== 'completed' || updatedEnrollment.next_run_at !== null) {
      throw new Error(`Verification failed: Expected enrollment to be completed with null next_run_at, got status ${updatedEnrollment.status}`);
    }
    console.log('Verified: Enrollment marked completed successfully!');

    console.log('🎉 Automated Follow-up Workflows Integration Test passed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    console.log('Cleaning up test data...');
    if (enrollmentId) {
      await db.deleteFrom('workflow_enrollments')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', enrollmentId as any)
        .execute();
    }
    if (workflowId) {
      await db.deleteFrom('workflow_steps')
        .where('tenant_id', '=', tenantId)
        .where('workflow_id', '=', workflowId as any)
        .execute();
      await db.deleteFrom('workflows')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', workflowId as any)
        .execute();
      await db.deleteFrom('user_activity')
        .where('tenant_id', '=', tenantId)
        .where('entity', '=', 'workflows')
        .where('entity_id', '=', workflowId)
        .execute();
    }
    if (testPersonId) {
      await db.deleteFrom('persons')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', testPersonId as any)
        .execute();
    }
    // Delete scheduled recurring background jobs created by the handler runs
    await db.deleteFrom('background_jobs')
      .where('status', '=', 'pending')
      .where(sql`payload->>'type'`, '=', 'process_drip_workflows')
      .execute();
    console.log('Cleanup finished.');
  }
}

runTest();
