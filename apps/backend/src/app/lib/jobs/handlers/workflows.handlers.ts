import type { Kysely, Selectable, Transaction } from 'kysely';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { logger } from '../../../logger';
import { scheduleNextRun, TEN_MINUTES_MS } from '../reschedule';

const ENROLLMENT_BATCH_SIZE = 500;
// Guard against a malformed sequence (e.g. an accidental cycle of zero-delay steps) monopolising
// a worker tick. A real sequence pauses at each `wait`, so this only ever bites pathological data.
const MAX_ACTIONS_PER_TICK = 50;

// Spec §16 execution: process active enrollments whose next_run_at is due. A step's `kind`
// decides what happens — `wait` reschedules and pauses the sequence; every action kind executes
// immediately (chaining through consecutive actions in one tick) and writes a workflow_runs row
// so the list's RUNS 30D / LAST RUN and the editor's RECENT RUNS reflect reality. Paused
// automations are skipped: "Pausing stops new runs immediately — nothing queues while paused."
export async function handleProcessDripWorkflows(db: Kysely<Models>): Promise<void> {
  const now = new Date();
  const pendingEnrollments = await db
    .selectFrom('workflow_enrollments')
    .selectAll()
    .where('status', '=', 'active')
    .where('next_run_at', '<=', now)
    .limit(ENROLLMENT_BATCH_SIZE)
    .execute();

  for (const enrollment of pendingEnrollments) {
    try {
      await db.transaction().execute(async (trx) => {
        const lockedEnrollment = await trx
          .selectFrom('workflow_enrollments')
          .selectAll()
          .where('id', '=', enrollment.id)
          .where('status', '=', 'active')
          .where('next_run_at', '<=', now)
          .forUpdate()
          .skipLocked()
          .executeTakeFirst();

        if (!lockedEnrollment) return;

        const workflow = await trx
          .selectFrom('workflows')
          .select(['id', 'name', 'status', 'createdby_id'])
          .where('id', '=', lockedEnrollment.workflow_id)
          .executeTakeFirst();

        // Workflow gone, or paused → do not run. Push the enrollment forward so a paused
        // automation doesn't hot-loop the batch; it resumes cleanly when un-paused.
        if (!workflow) {
          await completeEnrollment(trx, lockedEnrollment.id);
          return;
        }
        if (workflow.status === 'paused') {
          await trx
            .updateTable('workflow_enrollments')
            .set({ next_run_at: new Date(Date.now() + TEN_MINUTES_MS), updated_at: new Date() })
            .where('id', '=', lockedEnrollment.id)
            .execute();
          return;
        }

        const person = await trx
          .selectFrom('persons')
          .select(['id', 'email', 'first_name', 'last_name'])
          .where('id', '=', lockedEnrollment.person_id)
          .executeTakeFirst();

        const actorId = workflow.createdby_id ? String(workflow.createdby_id) : null;
        let currentStepNumber = lockedEnrollment.current_step_number;

        for (let i = 0; i < MAX_ACTIONS_PER_TICK; i++) {
          const step = await trx
            .selectFrom('workflow_steps')
            .selectAll()
            .where('workflow_id', '=', lockedEnrollment.workflow_id)
            .where('step_number', '=', currentStepNumber)
            .executeTakeFirst();

          if (!step) {
            await completeEnrollment(trx, lockedEnrollment.id);
            return;
          }

          const nextStep = await trx
            .selectFrom('workflow_steps')
            .select(['step_number'])
            .where('workflow_id', '=', lockedEnrollment.workflow_id)
            .where('step_number', '>', currentStepNumber)
            .orderBy('step_number', 'asc')
            .limit(1)
            .executeTakeFirst();

          // `wait`: schedule the delay, advance past the wait, and stop for this tick.
          if (step.kind === 'wait') {
            const delayMs =
              step.delay_unit === 'hours' ? step.delay_days * 60 * 60 * 1000 : step.delay_days * 24 * 60 * 60 * 1000;
            if (nextStep) {
              await trx
                .updateTable('workflow_enrollments')
                .set({
                  current_step_number: nextStep.step_number,
                  next_run_at: new Date(Date.now() + delayMs),
                  updated_at: new Date(),
                })
                .where('id', '=', lockedEnrollment.id)
                .execute();
            } else {
              await completeEnrollment(trx, lockedEnrollment.id);
            }
            return;
          }

          // Action step: execute, record the run (success or failed), then advance.
          try {
            await executeActionStep(trx, {
              tenantId: lockedEnrollment.tenant_id,
              workflowId: lockedEnrollment.workflow_id,
              actorId,
              person: person ?? null,
              step,
            });
            await recordRun(trx, {
              tenantId: lockedEnrollment.tenant_id,
              workflowId: lockedEnrollment.workflow_id,
              enrollmentId: lockedEnrollment.id,
              personId: lockedEnrollment.person_id,
              stepNumber: step.step_number,
              stepKind: step.kind,
              status: 'success',
              error: null,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await recordRun(trx, {
              tenantId: lockedEnrollment.tenant_id,
              workflowId: lockedEnrollment.workflow_id,
              enrollmentId: lockedEnrollment.id,
              personId: lockedEnrollment.person_id,
              stepNumber: step.step_number,
              stepKind: step.kind,
              status: 'failed',
              error: message,
            });
            logger.error({ err }, `Workflow ${lockedEnrollment.workflow_id} step ${step.step_number} failed`);
            // Narrate-and-continue: the failing step is recorded; the sequence advances so one
            // bad step doesn't wedge the enrollment forever (spec §16 "failures narrate the step").
          }

          if (!nextStep) {
            await completeEnrollment(trx, lockedEnrollment.id);
            return;
          }
          currentStepNumber = nextStep.step_number;
          await trx
            .updateTable('workflow_enrollments')
            .set({ current_step_number: currentStepNumber, next_run_at: new Date(), updated_at: new Date() })
            .where('id', '=', lockedEnrollment.id)
            .execute();
        }
      });
    } catch (err) {
      logger.error({ err }, `Failed to process workflow enrollment ${enrollment.id}`);
    }
  }

  // A full batch means there is likely more work waiting — requeue immediately.
  const delayMs = pendingEnrollments.length === ENROLLMENT_BATCH_SIZE ? 0 : TEN_MINUTES_MS;
  await scheduleNextRun(db, 'process_drip_workflows', delayMs);
}

async function completeEnrollment(trx: Transaction<Models>, enrollmentId: string): Promise<void> {
  await trx
    .updateTable('workflow_enrollments')
    .set({ status: 'completed', next_run_at: null, updated_at: new Date() })
    .where('id', '=', enrollmentId)
    .execute();
}

interface RunRecord {
  tenantId: string;
  workflowId: string;
  enrollmentId: string;
  personId: string;
  stepNumber: number;
  stepKind: string;
  status: 'success' | 'failed';
  error: string | null;
}

async function recordRun(trx: Transaction<Models>, run: RunRecord): Promise<void> {
  await trx
    .insertInto('workflow_runs')
    .values({
      tenant_id: run.tenantId,
      workflow_id: run.workflowId,
      enrollment_id: run.enrollmentId,
      person_id: run.personId,
      step_number: run.stepNumber,
      step_kind: run.stepKind,
      status: run.status,
      error: run.error,
    })
    .execute();
}

interface StepPerson {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface ActionContext {
  tenantId: string;
  workflowId: string;
  actorId: string | null;
  person: StepPerson | null;
  step: Selectable<Models['workflow_steps']>;
}

function readConfig(config: unknown): Record<string, unknown> {
  if (config == null) return {};
  if (typeof config === 'string') {
    try {
      const parsed: unknown = JSON.parse(config);
      return parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof config === 'object' ? (config as Record<string, unknown>) : {};
}

function str(value: unknown): string | null {
  return value == null ? null : String(value);
}

// Executes a single action step. Throws with a human-readable message on failure so the caller
// records a failed run whose `error` narrates what went wrong (surfaced on the list + editor).
async function executeActionStep(trx: Transaction<Models>, ctx: ActionContext): Promise<void> {
  const { step, person } = ctx;
  const config = readConfig(step.config);

  switch (step.kind) {
    case 'send_email': {
      if (!person?.email) throw new Error('Contact has no email address to send to');
      const text = step.plain_text_content || `Hello ${person.first_name || 'there'},\n\nThis is an automated message.`;
      const html =
        step.html_content || `<p>Hello ${person.first_name || 'there'},</p><p>This is an automated message.</p>`;
      await trx
        .insertInto('background_jobs')
        .values({
          tenant_id: ctx.tenantId,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({
            type: 'send-transactional-email',
            to: person.email,
            subject: step.subject || 'Automated message',
            text,
            html,
          }),
          run_at: new Date(),
          max_attempts: 5,
        })
        .execute();
      return;
    }

    case 'add_tag': {
      if (!person) throw new Error('No contact to tag');
      const tagId = str(config['tag_id']);
      if (!tagId) throw new Error('No tag configured for this step');
      if (!ctx.actorId) throw new Error('Automation has no owner to attribute the tag to');
      const exists = await trx
        .selectFrom('map_peoples_tags')
        .select('person_id')
        .where('tenant_id', '=', ctx.tenantId)
        .where('person_id', '=', person.id)
        .where('tag_id', '=', tagId)
        .executeTakeFirst();
      if (!exists) {
        await trx
          .insertInto('map_peoples_tags')
          .values({
            tenant_id: ctx.tenantId,
            person_id: person.id,
            tag_id: tagId,
            createdby_id: ctx.actorId,
            updatedby_id: ctx.actorId,
          })
          .execute();
      }
      return;
    }

    case 'create_task': {
      if (!ctx.actorId) throw new Error('Automation has no owner to assign the task to');
      const title = str(config['task_title']) || 'Follow up';
      const contactName = person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : '';
      await trx
        .insertInto('tasks')
        .values({
          tenant_id: ctx.tenantId,
          name: title,
          details: contactName ? `Automation task for ${contactName}` : undefined,
          status: 'todo',
          priority: 'medium',
          position: 0,
          createdby_id: ctx.actorId,
          updatedby_id: ctx.actorId,
        })
        .execute();
      return;
    }

    case 'notify_team': {
      const targetUserId = str(config['notify_user_id']) || ctx.actorId;
      if (!targetUserId) throw new Error('No team member configured to notify');
      const contactName = person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : 'a contact';
      const message = str(config['notify_message']) || `Automation update for ${contactName}`;
      await trx
        .insertInto('notifications')
        .values({
          tenant_id: ctx.tenantId,
          user_id: targetUserId,
          title: 'Automation notification',
          message,
          type: 'info',
          read: false,
        })
        .execute();
      return;
    }

    case 'wait':
      // Handled by the caller before reaching here.
      return;

    default: {
      const _exhaustive: never = step.kind;
      throw new Error(`Unknown step kind: ${String(_exhaustive)}`);
    }
  }
}
