import type { Kysely } from 'kysely';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { logger } from '../../../logger';
import { scheduleNextRun, TEN_MINUTES_MS } from '../reschedule';

const ENROLLMENT_BATCH_SIZE = 500;

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

        const step = await trx
          .selectFrom('workflow_steps')
          .selectAll()
          .where('workflow_id', '=', lockedEnrollment.workflow_id)
          .where('step_number', '=', lockedEnrollment.current_step_number)
          .executeTakeFirst();

        if (!step) {
          await trx
            .updateTable('workflow_enrollments')
            .set({
              status: 'completed',
              next_run_at: null,
              updated_at: new Date(),
            })
            .where('id', '=', lockedEnrollment.id)
            .execute();
          return;
        }

        const person = await trx
          .selectFrom('persons')
          .select(['id', 'email', 'first_name', 'last_name'])
          .where('id', '=', lockedEnrollment.person_id)
          .executeTakeFirst();

        if (person && person.email) {
          const textContent =
            step.plain_text_content || `Hello ${person.first_name || 'there'},\n\nThis is an automated message.`;
          const htmlContent =
            step.html_content || `<p>Hello ${person.first_name || 'there'},</p><p>This is an automated message.</p>`;

          await trx
            .insertInto('background_jobs')
            .values({
              tenant_id: lockedEnrollment.tenant_id,
              queue: 'default',
              status: 'pending',
              payload: JSON.stringify({
                type: 'send-transactional-email',
                to: person.email,
                subject: step.subject,
                text: textContent,
                html: htmlContent,
              }),
              run_at: new Date(),
              max_attempts: 5,
            })
            .execute();

          const workflow = await trx
            .selectFrom('workflows')
            .select(['name', 'createdby_id'])
            .where('id', '=', lockedEnrollment.workflow_id)
            .executeTakeFirst();

          // Only log activity if the workflow (and its creator) still exist;
          // skip the log rather than writing a row referencing a phantom user.
          if (workflow?.createdby_id) {
            const actorId = String(workflow.createdby_id);
            await trx
              .insertInto('user_activity')
              .values({
                tenant_id: lockedEnrollment.tenant_id,
                user_id: actorId,
                activity: 'send',
                entity: 'workflows',
                entity_id: String(lockedEnrollment.workflow_id),
                quantity: 1,
                metadata: JSON.stringify({
                  person_id: String(person.id),
                  person_name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
                  email: person.email,
                  subject: step.subject,
                  step_number: step.step_number,
                }),
                createdby_id: actorId,
                updatedby_id: actorId,
              })
              .execute();
          }
        }

        const nextStep = await trx
          .selectFrom('workflow_steps')
          .selectAll()
          .where('workflow_id', '=', lockedEnrollment.workflow_id)
          .where('step_number', '>', lockedEnrollment.current_step_number)
          .orderBy('step_number', 'asc')
          .limit(1)
          .executeTakeFirst();

        if (nextStep) {
          const delayMs =
            nextStep.delay_unit === 'hours'
              ? nextStep.delay_days * 60 * 60 * 1000
              : nextStep.delay_days * 24 * 60 * 60 * 1000;
          const nextRunAt = new Date(Date.now() + delayMs);
          await trx
            .updateTable('workflow_enrollments')
            .set({
              current_step_number: nextStep.step_number,
              next_run_at: nextRunAt,
              updated_at: new Date(),
            })
            .where('id', '=', lockedEnrollment.id)
            .execute();
        } else {
          await trx
            .updateTable('workflow_enrollments')
            .set({
              status: 'completed',
              next_run_at: null,
              updated_at: new Date(),
            })
            .where('id', '=', lockedEnrollment.id)
            .execute();
        }
      });
    } catch (err) {
      logger.error({ err }, `Failed to process drip workflow enrollment ${enrollment.id}`);
    }
  }

  // A full batch means there is likely more work waiting — requeue immediately.
  const delayMs = pendingEnrollments.length === ENROLLMENT_BATCH_SIZE ? 0 : TEN_MINUTES_MS;
  await scheduleNextRun(db, 'process_drip_workflows', delayMs);
}
