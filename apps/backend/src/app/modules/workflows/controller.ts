import { BaseController } from '../../lib/base.controller';
import { WorkflowsRepo } from './repositories/workflows.repo';
import { WorkflowEnrollmentsRepo } from './repositories/workflow-enrollments.repo';
import { Transaction } from 'kysely';
import { Models, OperationDataType } from 'common/src/lib/kysely.models';
import { TRPCError } from '@trpc/server';

export class WorkflowsController extends BaseController<'workflows', WorkflowsRepo> {
  private readonly enrollmentsRepo = new WorkflowEnrollmentsRepo();

  constructor() {
    super(new WorkflowsRepo());
  }

  /**
   * Retrieves all steps for a specific workflow, ordered by step_number.
   */
  public async getSteps(tenantId: string, workflowId: string, trx?: Transaction<Models>) {
    const db = trx || this.getRepo().db;
    const steps = await db
      .selectFrom('workflow_steps')
      .selectAll()
      .where('tenant_id', '=', tenantId as any)
      .where('workflow_id', '=', workflowId as any)
      .orderBy('step_number', 'asc')
      .execute();
    return steps.map((s) => ({
      ...s,
      id: String(s.id),
      workflow_id: String(s.workflow_id),
    }));
  }

  /**
   * Bulk updates/saves the steps for a workflow.
   */
  public async saveSteps(tenantId: string, workflowId: string, steps: any[], userId: string) {
    await this.getRepo().transaction().execute(async (trx) => {
      // 1. Verify workflow exists and belongs to tenant
      const workflow = await trx
        .selectFrom('workflows')
        .select('id')
        .where('tenant_id', '=', tenantId as any)
        .where('id', '=', workflowId as any)
        .executeTakeFirst();

      if (!workflow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found.',
        });
      }

      // 2. Delete all existing steps
      await trx
        .deleteFrom('workflow_steps')
        .where('tenant_id', '=', tenantId as any)
        .where('workflow_id', '=', workflowId as any)
        .execute();

      // 3. Insert new steps
      if (steps.length > 0) {
        const insertRows = steps.map((step, idx) => ({
          tenant_id: tenantId,
          workflow_id: workflowId,
          step_number: idx + 1,
          delay_days: Number(step.delay_days || 0),
          subject: step.subject || 'Follow-up Email',
          preview_text: step.preview_text || null,
          html_content: step.html_content || null,
          plain_text_content: step.plain_text_content || null,
        } as OperationDataType<'workflow_steps', 'insert'>));

        await trx.insertInto('workflow_steps').values(insertRows).execute();
      }

      // Log update activity
      await this.userActivity.log({
        tenant_id: tenantId,
        user_id: userId,
        activity: 'update',
        entity: 'workflows',
        entity_id: workflowId,
        quantity: 1,
        metadata: { id: workflowId, action: 'save_steps', stepsCount: steps.length },
      }, trx);
    });

    return { success: true };
  }

  /**
   * Retrieves active enrollments with person details for a workflow.
   */
  public async getEnrollments(tenantId: string, workflowId: string, options?: any) {
    return this.enrollmentsRepo.getEnrollmentsWithPersonDetails({
      tenant_id: tenantId,
      workflow_id: workflowId,
      options,
    });
  }

  /**
   * Enrolls a person in a workflow manually.
   */
  public async enrollPerson(tenantId: string, personId: string, workflowId: string, userId: string) {
    return this.getRepo().transaction().execute(async (trx) => {
      // 1. Verify person exists
      const person = await trx
        .selectFrom('persons')
        .select(['id', 'first_name', 'last_name', 'email'])
        .where('tenant_id', '=', tenantId as any)
        .where('id', '=', personId as any)
        .executeTakeFirst();

      if (!person) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Person not found.',
        });
      }

      // 2. Verify workflow exists and is active
      const workflow = await trx
        .selectFrom('workflows')
        .select(['id', 'status', 'name'])
        .where('tenant_id', '=', tenantId as any)
        .where('id', '=', workflowId as any)
        .executeTakeFirst();

      if (!workflow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found.',
        });
      }

      // 3. Check if already enrolled in an active state
      const existing = await trx
        .selectFrom('workflow_enrollments')
        .select('id')
        .where('tenant_id', '=', tenantId as any)
        .where('workflow_id', '=', workflowId as any)
        .where('person_id', '=', personId as any)
        .where('status', '=', 'active')
        .executeTakeFirst();

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This person is already enrolled in this workflow.',
        });
      }

      // 4. Find the first step of this workflow
      const firstStep = await trx
        .selectFrom('workflow_steps')
        .select(['step_number', 'delay_days'])
        .where('tenant_id', '=', tenantId as any)
        .where('workflow_id', '=', workflowId as any)
        .orderBy('step_number', 'asc')
        .executeTakeFirst();

      if (!firstStep) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This workflow does not have any steps yet.',
        });
      }

      // 5. Calculate next run at based on step delay
      const nextRunAt = new Date(Date.now() + firstStep.delay_days * 24 * 60 * 60 * 1000);

      // 6. Insert enrollment
      const insertRow = {
        tenant_id: tenantId,
        workflow_id: workflowId,
        person_id: personId,
        status: 'active',
        current_step_number: firstStep.step_number,
        next_run_at: nextRunAt,
      } as OperationDataType<'workflow_enrollments', 'insert'>;

      const result = await trx
        .insertInto('workflow_enrollments')
        .values(insertRow)
        .returningAll()
        .executeTakeFirstOrThrow();

      // Log user activity
      await this.userActivity.log({
        tenant_id: tenantId,
        user_id: userId,
        activity: 'assign',
        entity: 'workflows',
        entity_id: workflowId,
        quantity: 1,
        metadata: {
          id: workflowId,
          person_id: personId,
          person_name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
          next_run_at: nextRunAt.toISOString(),
        },
      }, trx);

      return {
        ...result,
        id: String(result.id),
        workflow_id: String(result.workflow_id),
        person_id: String(result.person_id),
      };
    });
  }

  /**
   * Cancels a person's enrollment.
   */
  public async cancelEnrollment(tenantId: string, enrollmentId: string, userId: string) {
    return this.getRepo().transaction().execute(async (trx) => {
      const enrollment = await trx
        .selectFrom('workflow_enrollments')
        .select(['id', 'workflow_id', 'person_id', 'status'])
        .where('tenant_id', '=', tenantId as any)
        .where('id', '=', enrollmentId as any)
        .executeTakeFirst();

      if (!enrollment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Enrollment not found.',
        });
      }

      if (enrollment.status !== 'active') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only active enrollments can be cancelled.',
        });
      }

      await trx
        .updateTable('workflow_enrollments')
        .set({
          status: 'cancelled',
          next_run_at: null,
          updated_at: new Date(),
        })
        .where('tenant_id', '=', tenantId as any)
        .where('id', '=', enrollmentId as any)
        .execute();

      // Look up person's name for log
      const person = await trx
        .selectFrom('persons')
        .select(['first_name', 'last_name'])
        .where('id', '=', enrollment.person_id)
        .executeTakeFirst();

      // Log activity
      await this.userActivity.log({
        tenant_id: tenantId,
        user_id: userId,
        activity: 'unassign',
        entity: 'workflows',
        entity_id: String(enrollment.workflow_id),
        quantity: 1,
        metadata: {
          id: String(enrollment.workflow_id),
          person_id: String(enrollment.person_id),
          person_name: person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : 'Unknown Contact',
        },
      }, trx);

      return { success: true };
    });
  }

  /**
   * Automatic trigger hook: Enrolls a constituent into active workflows triggered by volunteer signups.
   */
  public async triggerVolunteerSignup(tenantId: string, personId: string, trx: Transaction<Models>) {
    // 1. Find all active workflows with volunteer_signup trigger
    const activeWorkflows = await trx
      .selectFrom('workflows')
      .select(['id', 'name'])
      .where('tenant_id', '=', tenantId as any)
      .where('trigger_type', '=', 'volunteer_signup')
      .where('status', '=', 'active')
      .execute();

    if (activeWorkflows.length === 0) return;

    // Look up the default tenant admin actor ID
    const tenantRow = await trx
      .selectFrom('tenants')
      .select('admin_id')
      .where('id', '=', tenantId as any)
      .executeTakeFirst();
    const creatorId = tenantRow?.admin_id || '1';

    for (const wf of activeWorkflows) {
      try {
        await this.enrollPerson(tenantId, personId, String(wf.id), creatorId);
      } catch (err: any) {
        // Safe check in case they're already enrolled
        if (err.message?.includes('already enrolled')) {
          console.log(`Person ${personId} is already enrolled in workflow ${wf.id}. Skipping.`);
        } else {
          console.error(`Failed to enroll person ${personId} in workflow ${wf.id}:`, err);
        }
      }
    }
  }
}
