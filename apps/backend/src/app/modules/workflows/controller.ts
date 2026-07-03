import { BaseController } from '../../lib/base.controller';
import { WorkflowsRepo } from './repositories/workflows.repo';
import { WorkflowEnrollmentsRepo } from './repositories/workflow-enrollments.repo';
import type { Transaction, Kysely } from 'kysely';
import type { Models, OperationDataType } from '../../../../../../libs/common/src/lib/kysely.models';
import { TRPCError } from '@trpc/server';
import { logger } from '../../logger';

export class WorkflowsController extends BaseController<'workflows', WorkflowsRepo> {
  private readonly enrollmentsRepo = new WorkflowEnrollmentsRepo();

  constructor() {
    super(new WorkflowsRepo());
  }

  public override async getOneById(input: { tenant_id: string; id: string }) {
    const workflow = await super.getOneById(input);
    if (!workflow) return workflow;
    return this.resolveCreatorAndUpdater(input.tenant_id, workflow);
  }

  public async getSteps(tenantId: string, workflowId: string, trx?: Transaction<Models>) {
    const db = trx || this.getRepo().db;
    const steps = await db
      .selectFrom('workflow_steps')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('workflow_id', '=', workflowId)
      .orderBy('step_number', 'asc')
      .execute();
    return steps.map((s) => ({
      ...s,
      id: String(s.id),
      workflow_id: String(s.workflow_id),
    }));
  }

  public async saveSteps(tenantId: string, workflowId: string, steps: any[], userId: string) {
    await this.getRepo()
      .transaction()
      .execute(async (trx) => {
        // 1. Verify workflow exists and belongs to tenant
        const workflow = await trx
          .selectFrom('workflows')
          .select('id')
          .where('tenant_id', '=', tenantId)
          .where('id', '=', workflowId)
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
          .where('tenant_id', '=', tenantId)
          .where('workflow_id', '=', workflowId)
          .execute();

        // 3. Insert new steps
        if (steps.length > 0) {
          const insertRows = steps.map(
            (step, idx) =>
              ({
                tenant_id: tenantId,
                workflow_id: workflowId,
                step_number: idx + 1,
                delay_days: Number(step.delay_days || 0),
                delay_unit: step.delay_unit || 'days',
                subject: step.subject || 'Follow-up Email',
                preview_text: step.preview_text || null,
                html_content: step.html_content || null,
                plain_text_content: step.plain_text_content || null,
              }) as any,
          );

          await trx.insertInto('workflow_steps').values(insertRows).execute();
        }

        // Log update activity
        await this.userActivity.log(
          {
            tenant_id: tenantId,
            user_id: userId,
            activity: 'update',
            entity: 'workflows',
            entity_id: workflowId,
            quantity: 1,
            metadata: { id: workflowId, action: 'save_steps', stepsCount: steps.length },
          },
          trx,
        );
      });

    return { success: true };
  }

  public async getEnrollments(tenantId: string, workflowId: string, options?: any) {
    return this.enrollmentsRepo.getEnrollmentsWithPersonDetails({
      tenant_id: tenantId,
      workflow_id: workflowId,
      options,
    });
  }

  public async enrollPerson(
    tenantId: string,
    personId: string,
    workflowId: string,
    userId: string,
    trx?: Transaction<Models> | Kysely<Models>,
  ) {
    const executeLogic = async (t: Transaction<Models> | Kysely<Models>) => {
      // 1. Verify person exists
      const person = await t
        .selectFrom('persons')
        .select(['id', 'first_name', 'last_name', 'email'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', personId)
        .executeTakeFirst();

      if (!person) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Person not found.',
        });
      }

      // 2. Verify workflow exists and is active
      const workflow = await t
        .selectFrom('workflows')
        .select(['id', 'status', 'name'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', workflowId)
        .executeTakeFirst();

      if (!workflow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found.',
        });
      }

      // 3. Check if already enrolled in an active state
      const existing = await t
        .selectFrom('workflow_enrollments')
        .select('id')
        .where('tenant_id', '=', tenantId)
        .where('workflow_id', '=', workflowId)
        .where('person_id', '=', personId)
        .where('status', '=', 'active')
        .executeTakeFirst();

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This person is already enrolled in this workflow.',
        });
      }

      // 4. Find the first step of this workflow
      const firstStep = await t
        .selectFrom('workflow_steps')
        .select(['step_number', 'delay_days', 'delay_unit'])
        .where('tenant_id', '=', tenantId)
        .where('workflow_id', '=', workflowId)
        .orderBy('step_number', 'asc')
        .executeTakeFirst();

      if (!firstStep) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This workflow does not have any steps yet.',
        });
      }

      // 5. Calculate next run at based on step delay
      const delayMs =
        firstStep.delay_unit === 'hours'
          ? firstStep.delay_days * 60 * 60 * 1000
          : firstStep.delay_days * 24 * 60 * 60 * 1000;
      const nextRunAt = new Date(Date.now() + delayMs);

      // 6. Insert enrollment
      const insertRow = {
        tenant_id: tenantId,
        workflow_id: workflowId,
        person_id: personId,
        status: 'active',
        current_step_number: firstStep.step_number,
        next_run_at: nextRunAt,
      } as OperationDataType<'workflow_enrollments', 'insert'>;

      const result = await t
        .insertInto('workflow_enrollments')
        .values(insertRow)
        .returningAll()
        .executeTakeFirstOrThrow();

      // Log user activity
      await this.userActivity.log(
        {
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
        },
        typeof (t as any).transaction === 'undefined' ? (t as Transaction<Models>) : undefined,
      );

      return {
        ...result,
        id: String(result.id),
        workflow_id: String(result.workflow_id),
        person_id: String(result.person_id),
      };
    };

    if (trx) {
      return executeLogic(trx);
    } else {
      return this.getRepo()
        .transaction()
        .execute(async (t) => executeLogic(t));
    }
  }

  public async cancelEnrollment(tenantId: string, enrollmentId: string, userId: string) {
    return this.getRepo()
      .transaction()
      .execute(async (trx) => {
        const enrollment = await trx
          .selectFrom('workflow_enrollments')
          .select(['id', 'workflow_id', 'person_id', 'status'])
          .where('tenant_id', '=', tenantId)
          .where('id', '=', enrollmentId)
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
          .where('tenant_id', '=', tenantId)
          .where('id', '=', enrollmentId)
          .execute();

        // Look up person's name for log
        const person = await trx
          .selectFrom('persons')
          .select(['first_name', 'last_name'])
          .where('tenant_id', '=', tenantId)
          .where('id', '=', enrollment.person_id)
          .executeTakeFirst();

        // Log activity
        await this.userActivity.log(
          {
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
          },
          trx,
        );

        return { success: true };
      });
  }

  public async triggerWorkflow(
    tenantId: string,
    personId: string,
    triggerType: string,
    triggerEventId: string | null | undefined,
    trx?: Transaction<Models> | Kysely<Models>,
  ) {
    const db = trx || this.getRepo().db;
    let query = db
      .selectFrom('workflows')
      .select(['id', 'name'])
      .where('tenant_id', '=', tenantId)
      .where('trigger_type', '=', triggerType)
      .where('status', '=', 'active');

    if (triggerEventId) {
      query = query.where((eb) =>
        eb.or([eb('trigger_event_id', 'is', null), eb('trigger_event_id', '=', triggerEventId as any)]),
      );
    } else {
      query = query.where('trigger_event_id', 'is', null);
    }

    const activeWorkflows = await query.execute();
    if (activeWorkflows.length === 0) return;

    // Look up the default tenant admin actor ID
    const tenantRow = await db.selectFrom('tenants').select('admin_id').where('id', '=', tenantId).executeTakeFirst();
    if (!tenantRow?.admin_id) {
      logger.warn(`triggerWorkflow: skipping automation for tenant ${tenantId} — admin_id not configured.`);
      return;
    }
    const creatorId = String(tenantRow.admin_id);

    for (const wf of activeWorkflows) {
      try {
        await this.enrollPerson(tenantId, personId, String(wf.id), creatorId, trx as any);
      } catch (err) {
        // Safe check in case they're already enrolled
        if (err instanceof Error && err.message.includes('already enrolled')) {
          logger.info(`Person ${personId} is already enrolled in workflow ${wf.id}. Skipping.`);
        } else {
          logger.error({ err }, `Failed to enroll person ${personId} in workflow ${wf.id}`);
        }
      }
    }
  }

  public async triggerVolunteerSignup(
    tenantId: string,
    personId: string,
    eventId: string | null | undefined,
    trx: Transaction<Models>,
  ) {
    return this.triggerWorkflow(tenantId, personId, 'volunteer_signup', eventId, trx);
  }

  public async triggerTagAdded(
    tenantId: string,
    personId: string,
    tagId: string,
    tagName: string,
    trx?: Transaction<Models> | Kysely<Models>,
  ) {
    // 1. General tag_added trigger (filtered by tagId, or any tag if no filter)
    await this.triggerWorkflow(tenantId, personId, 'tag_added', tagId, trx);

    // 2. Specialized triggers based on tag name
    const normalized = tagName.trim().toLowerCase();
    if (normalized === 'subscriber') {
      await this.triggerWorkflow(tenantId, personId, 'new_subscriber', null, trx);
    } else if (normalized === 'unsubscribed') {
      await this.triggerWorkflow(tenantId, personId, 'new_unsubscriber', null, trx);
    }
  }
}
