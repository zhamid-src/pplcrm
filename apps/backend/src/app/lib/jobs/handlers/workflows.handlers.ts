import type { Kysely, Selectable, Transaction } from 'kysely';
import { WORKFLOW_EXIT_CONDITIONS, WORKFLOW_SEND_CONDITIONS } from '@common';
import type { WorkflowExitCondition, WorkflowSendCondition } from '@common';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { env } from '../../../../env';
import { logger } from '../../../logger';
import {
  assertTenantSendingNotBlocked,
  hasVerifiedSendingDomain,
  loadSendingTenant,
  logAutomationSend,
  remainingSendAllowance,
} from '../../../modules/newsletters/send-guards';
import { encodeUnsubscribeToken } from '../../../modules/newsletters/unsubscribe-token';
import { resolveAutomationSendConsent } from '../../../modules/workflows/automation-consent';
import { scheduleNextRun, TEN_MINUTES_MS } from '../reschedule';

const ENROLLMENT_BATCH_SIZE = 500;
const ONE_HOUR_MS = 60 * 60 * 1000;

/** The recipient must not be emailed (unsubscribed/suppressed/DNC). Recorded as a 'skipped'
 * run — not a failure — and the sequence advances past the step. */
class SkipStepError extends Error {}

/** The tenant temporarily can't send (paused/suspended/payment hold/allowance exhausted).
 * The enrollment is deferred an hour WITHOUT advancing — the email is delayed, never lost. */
class RetryLaterError extends Error {}
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
          .select(['id', 'name', 'status', 'createdby_id', 'exit_conditions'])
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

        // Sequence-level goals: the moment one is met the enrollment ends — a supporter who
        // already donated must not get the rest of the ask sequence.
        const exitReason = await findMetExitCondition(trx, {
          tenantId: lockedEnrollment.tenant_id,
          enrollmentId: lockedEnrollment.id,
          personId: lockedEnrollment.person_id,
          enrolledAt: new Date(lockedEnrollment.enrolled_at),
          exitConditions: workflow.exit_conditions,
        });
        if (exitReason) {
          await recordRun(trx, {
            tenantId: lockedEnrollment.tenant_id,
            workflowId: lockedEnrollment.workflow_id,
            enrollmentId: lockedEnrollment.id,
            personId: lockedEnrollment.person_id,
            stepNumber: null,
            stepKind: 'exit',
            status: 'success',
            error: exitReason,
          });
          await trx
            .updateTable('workflow_enrollments')
            .set({ status: 'exited', next_run_at: null, updated_at: new Date() })
            .where('id', '=', lockedEnrollment.id)
            .execute();
          return;
        }

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

          // Action step: execute, record the run (success, skipped, or failed), then advance.
          // send_email records its own run first (the delivery job carries the run id for
          // engagement stamping); every other kind is recorded here after executing.
          try {
            const outcome = await executeActionStep(trx, {
              tenantId: lockedEnrollment.tenant_id,
              workflowId: lockedEnrollment.workflow_id,
              enrollmentId: lockedEnrollment.id,
              actorId,
              person: person ?? null,
              step,
            });
            if (!outcome.runRecorded) {
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
            }
          } catch (err) {
            // Tenant-level sending block: defer the whole enrollment an hour without advancing
            // or recording a run — a welcome email during a payment hold is late, not lost.
            if (err instanceof RetryLaterError) {
              await trx
                .updateTable('workflow_enrollments')
                .set({ next_run_at: new Date(Date.now() + ONE_HOUR_MS), updated_at: new Date() })
                .where('id', '=', lockedEnrollment.id)
                .execute();
              logger.info(
                { workflowId: lockedEnrollment.workflow_id, reason: err.message },
                'Automation send deferred — tenant sending blocked or allowance exhausted',
              );
              return;
            }
            const message = err instanceof Error ? err.message : String(err);
            await recordRun(trx, {
              tenantId: lockedEnrollment.tenant_id,
              workflowId: lockedEnrollment.workflow_id,
              enrollmentId: lockedEnrollment.id,
              personId: lockedEnrollment.person_id,
              stepNumber: step.step_number,
              stepKind: step.kind,
              status: err instanceof SkipStepError ? 'skipped' : 'failed',
              error: message,
            });
            if (!(err instanceof SkipStepError)) {
              logger.error({ err }, `Workflow ${lockedEnrollment.workflow_id} step ${step.step_number} failed`);
            }
            // Narrate-and-continue: the failing/skipped step is recorded; the sequence advances
            // so one bad step doesn't wedge the enrollment forever (spec §16).
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

const LAPSED_DEFAULT_DAYS = 90;
const LAPSED_MIN_DAYS = 7;
const MAX_LAPSED_ENROLLMENTS_PER_RUN = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily scan behind the `supporter_lapsed` trigger ("Supporter goes quiet"). For each active
 * workflow on that trigger, find subscribed people whose consent predates the workflow's
 * inactivity window (trigger_event_id, days; default 90) and who have no opens/clicks inside
 * it, then enroll them through the normal trigger path (conditions respected).
 *
 * Re-enrollment hygiene: `enrollPerson` only blocks people with an ACTIVE enrollment, so a
 * completed win-back sequence would otherwise re-enroll the same person every day. Anyone
 * enrolled in this workflow within the last 2×N days is excluded — a person gets at most one
 * win-back per two windows. First activation on a big stale list is capped at 500 enrollments
 * per workflow per day (the sends are additionally metered by the tenant's caps).
 */
export async function handleDetectLapsedSupporters(db: Kysely<Models>): Promise<void> {
  const now = new Date();
  const lapsedWorkflows = await db
    .selectFrom('workflows')
    .select(['id', 'tenant_id', 'trigger_event_id'])
    .where('trigger_type', '=', 'supporter_lapsed')
    .where('status', '=', 'active')
    .execute();

  if (lapsedWorkflows.length > 0) {
    const { WorkflowsController } = await import('../../../modules/workflows/controller');
    const controller = new WorkflowsController();

    for (const wf of lapsedWorkflows) {
      const tenantId = String(wf.tenant_id);
      const workflowId = String(wf.id);
      const days = Math.max(LAPSED_MIN_DAYS, parseInt(wf.trigger_event_id ?? '', 10) || LAPSED_DEFAULT_DAYS);
      const cutoff = new Date(now.getTime() - days * DAY_MS);
      const dedupeCutoff = new Date(now.getTime() - 2 * days * DAY_MS);

      try {
        const candidates = await db
          .selectFrom('persons')
          .select(['persons.id'])
          .where('persons.tenant_id', '=', tenantId)
          .where('persons.email', 'is not', null)
          .where('persons.email', '!=', '')
          // Subscribed long enough ago that "quiet since then" is meaningful.
          .where(({ exists, selectFrom }) =>
            exists(
              selectFrom('campaign_subscriptions')
                .select('campaign_subscriptions.id')
                .where('campaign_subscriptions.tenant_id', '=', tenantId)
                .where('campaign_subscriptions.status', '=', 'subscribed')
                .where('campaign_subscriptions.consent_at', '<', cutoff)
                .whereRef('campaign_subscriptions.person_id', '=', 'persons.id'),
            ),
          )
          // No engagement inside the window — rollups first, then any un-pruned raw events.
          .where(({ not, exists, selectFrom }) =>
            not(
              exists(
                selectFrom('person_newsletter_engagements')
                  .select('person_newsletter_engagements.email')
                  .where('person_newsletter_engagements.tenant_id', '=', tenantId)
                  .whereRef('person_newsletter_engagements.email', '=', 'persons.email')
                  .where((inner) =>
                    inner.or([
                      inner('person_newsletter_engagements.last_opened_at', '>', cutoff),
                      inner('person_newsletter_engagements.last_clicked_at', '>', cutoff),
                    ]),
                  ),
              ),
            ),
          )
          .where(({ not, exists, selectFrom }) =>
            not(
              exists(
                selectFrom('newsletter_events')
                  .select('newsletter_events.id')
                  .where('newsletter_events.tenant_id', '=', tenantId)
                  .whereRef('newsletter_events.email', '=', 'persons.email')
                  .where('newsletter_events.event_type', 'in', ['open', 'click'])
                  .where('newsletter_events.timestamp', '>', cutoff),
              ),
            ),
          )
          // Not enrolled in this workflow within the last two windows (any status).
          .where(({ not, exists, selectFrom }) =>
            not(
              exists(
                selectFrom('workflow_enrollments')
                  .select('workflow_enrollments.id')
                  .where('workflow_enrollments.tenant_id', '=', tenantId)
                  .where('workflow_enrollments.workflow_id', '=', workflowId)
                  .whereRef('workflow_enrollments.person_id', '=', 'persons.id')
                  .where('workflow_enrollments.created_at', '>', dedupeCutoff),
              ),
            ),
          )
          .limit(MAX_LAPSED_ENROLLMENTS_PER_RUN)
          .execute();

        for (const candidate of candidates) {
          // The trigger path evaluates the workflow's "ONLY ENROLL IF" conditions; passing the
          // workflow's own trigger_event_id keeps differently-windowed workflows separate.
          await controller.triggerWorkflow(tenantId, String(candidate.id), 'supporter_lapsed', wf.trigger_event_id);
        }
        if (candidates.length > 0) {
          logger.info(
            { workflowId, tenantId, enrolled: candidates.length, days },
            '[supporter-lapsed] Enrolled quiet supporters',
          );
        }
      } catch (err) {
        logger.error({ err, workflowId }, '[supporter-lapsed] Failed to scan workflow');
      }
    }
  }

  await scheduleNextRun(db, 'detect_lapsed_supporters', 24 * 60 * 60 * 1000);
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
  stepNumber: number | null;
  stepKind: string;
  status: 'success' | 'failed' | 'skipped';
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
  enrollmentId: string;
  actorId: string | null;
  person: StepPerson | null;
  step: Selectable<Models['workflow_steps']>;
}

interface ActionOutcome {
  /** True when the step already wrote its own workflow_runs row (send_email does, so the
   * delivery job can carry the run id). */
  runRecorded: boolean;
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
async function executeActionStep(trx: Transaction<Models>, ctx: ActionContext): Promise<ActionOutcome> {
  const { step, person } = ctx;
  const config = readConfig(step.config);

  switch (step.kind) {
    case 'send_email': {
      if (!person?.email) throw new Error('Contact has no email address to send to');
      // An empty step must fail loudly, not fall back to a canned "this is an automated
      // message" body — a placeholder email to a real supporter damages trust.
      // Same merge-token syntax as the newsletter composer; substituted here because the
      // delivery path sends content verbatim.
      const substitute = (content: string): string =>
        content
          .replaceAll('{{first_name}}', person.first_name || 'there')
          .replaceAll('{{last_name}}', person.last_name || '');
      const text = step.plain_text_content ? substitute(step.plain_text_content) : null;
      const html = step.html_content ? substitute(step.html_content) : null;
      if (!text && !html) throw new Error('This email step has no content — edit the step and add a message');

      // Engagement gate first — the sequence author said not to send in this case, so it
      // outranks even consent checks (delay-then-check drip: pair with a preceding wait step).
      const sendCondition = parseSendCondition(config['send_condition']);
      if (sendCondition) {
        const previous = await trx
          .selectFrom('workflow_runs')
          .select(['opened_at', 'clicked_at'])
          .where('tenant_id', '=', ctx.tenantId)
          .where('enrollment_id', '=', ctx.enrollmentId)
          .where('step_kind', '=', 'send_email')
          .where('status', '=', 'success')
          .where('step_number', '<', step.step_number)
          .orderBy('step_number', 'desc')
          .limit(1)
          .executeTakeFirst();
        const verdict = evaluateSendCondition(sendCondition, previous ?? null);
        if (!verdict.send) throw new SkipStepError(verdict.reason);
      }

      // Consent (unsubscribed/suppressed/DNC) → skip this recipient, honestly narrated.
      const consent = await resolveAutomationSendConsent(trx, ctx.tenantId, { id: person.id, email: person.email });
      if (!consent.ok) throw new SkipStepError(consent.reason);

      // Automation emails obey the same tenant sending gates and caps as newsletters — an
      // automation must not be a side-channel around pauses, holds, or the plan meter.
      const tenant = await loadSendingTenant(trx, ctx.tenantId);
      try {
        assertTenantSendingNotBlocked(tenant);
      } catch (err) {
        throw new RetryLaterError(err instanceof Error ? err.message : String(err));
      }
      if ((await remainingSendAllowance(trx, tenant, new Date())) < 1) {
        throw new RetryLaterError('Sending allowance exhausted for now');
      }

      // Same identity gate as newsletters: automation emails send from the tenant's own
      // verified-domain address via SendGrid, never a platform address.
      if (!(await hasVerifiedSendingDomain(trx, ctx.tenantId))) {
        throw new Error(
          'Verify a sending domain and choose a From address (Settings) so automation emails can send. This email was not sent.',
        );
      }

      const unsubscribeUrl = `${env.apiUrl}/api/unsubscribe/${encodeUnsubscribeToken({
        tenantId: ctx.tenantId,
        personId: person.id,
        email: person.email,
      })}`;

      // Record the run BEFORE enqueueing the delivery job — the job carries the run id as a
      // SendGrid custom arg, and the event webhook stamps opens/clicks back onto this row.
      // Same transaction, so a rollback takes both the run and the job (no ghosts either way).
      const run = await trx
        .insertInto('workflow_runs')
        .values({
          tenant_id: ctx.tenantId,
          workflow_id: ctx.workflowId,
          enrollment_id: ctx.enrollmentId,
          person_id: person.id,
          step_number: step.step_number,
          step_kind: step.kind,
          status: 'success',
          error: null,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      await trx
        .insertInto('background_jobs')
        .values({
          tenant_id: ctx.tenantId,
          queue: 'default',
          status: 'pending',
          payload: JSON.stringify({
            type: 'send-automation-email',
            tenantId: ctx.tenantId,
            workflowRunId: String(run.id),
            to: person.email,
            subject: step.subject ? substitute(step.subject) : 'Automated message',
            text: text ?? '',
            html: html ?? '',
            unsubscribeUrl,
          }),
          run_at: new Date(),
          max_attempts: 5,
        })
        .execute();
      await logAutomationSend(trx, ctx.tenantId);
      return { runRecorded: true };
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
      return { runRecorded: false };
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
      return { runRecorded: false };
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
      return { runRecorded: false };
    }

    case 'wait':
      // Handled by the caller before reaching here.
      return { runRecorded: false };

    default: {
      const _exhaustive: never = step.kind;
      throw new Error(`Unknown step kind: ${String(_exhaustive)}`);
    }
  }
}

/* ── Engagement-reactive primitives ──────────────────────────────────────────── */

export interface SendConditionInput {
  opened_at: Date | string | null;
  clicked_at: Date | string | null;
}

export type SendConditionVerdict = { send: true } | { send: false; reason: string };

function parseSendCondition(value: unknown): WorkflowSendCondition | null {
  return typeof value === 'string' && (WORKFLOW_SEND_CONDITIONS as readonly string[]).includes(value)
    ? (value as WorkflowSendCondition)
    : null;
}

/**
 * Gate a send_email step on what the recipient did with the PREVIOUS email in this sequence.
 * `previous` is the most recent successfully-sent email run for the enrollment, or null when
 * this is the first email — in which case "did engage" conditions can never hold (skip) and
 * "did not engage" conditions trivially hold (send). Pure, for unit tests.
 */
export function evaluateSendCondition(
  condition: WorkflowSendCondition,
  previous: SendConditionInput | null,
): SendConditionVerdict {
  const opened = previous?.opened_at != null;
  const clicked = previous?.clicked_at != null;
  switch (condition) {
    case 'previous_not_opened':
      return opened
        ? { send: false, reason: 'They opened the previous email, so this follow-up was skipped' }
        : { send: true };
    case 'previous_not_clicked':
      return clicked
        ? { send: false, reason: 'They clicked the previous email, so this follow-up was skipped' }
        : { send: true };
    case 'previous_opened':
      if (!previous)
        return { send: false, reason: 'No earlier email in this sequence to check, so this step was skipped' };
      return opened
        ? { send: true }
        : { send: false, reason: 'The previous email was not opened, so this step was skipped' };
    case 'previous_clicked':
      if (!previous)
        return { send: false, reason: 'No earlier email in this sequence to check, so this step was skipped' };
      return clicked
        ? { send: true }
        : { send: false, reason: 'The previous email was not clicked, so this step was skipped' };
    default: {
      const _exhaustive: never = condition;
      throw new Error(`Unknown send condition: ${String(_exhaustive)}`);
    }
  }
}

function parseExitConditions(value: unknown): WorkflowExitCondition[] {
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((v): v is WorkflowExitCondition =>
    (WORKFLOW_EXIT_CONDITIONS as readonly string[]).includes(String(v)),
  );
}

interface ExitContext {
  tenantId: string;
  enrollmentId: string;
  personId: string;
  enrolledAt: Date;
  exitConditions: unknown;
}

/**
 * The first met sequence goal, as a human-readable narration, or null when none is met.
 * 'donated' looks for a standing (non-refunded) gift recorded after enrollment; the engagement
 * goals read the opens/clicks the event webhook stamped onto this enrollment's email runs.
 */
async function findMetExitCondition(trx: Transaction<Models>, ctx: ExitContext): Promise<string | null> {
  const conditions = parseExitConditions(ctx.exitConditions);
  if (conditions.length === 0) return null;

  if (conditions.includes('donated')) {
    const gift = await trx
      .selectFrom('donations')
      .select('id')
      .where('tenant_id', '=', ctx.tenantId)
      .where('person_id', '=', ctx.personId)
      .where('created_at', '>', ctx.enrolledAt)
      .where('refunded_at', 'is', null)
      .limit(1)
      .executeTakeFirst();
    if (gift) return 'Goal met: they donated. The rest of the sequence was skipped.';
  }

  if (conditions.includes('clicked_any_email')) {
    const clicked = await trx
      .selectFrom('workflow_runs')
      .select('id')
      .where('tenant_id', '=', ctx.tenantId)
      .where('enrollment_id', '=', ctx.enrollmentId)
      .where('clicked_at', 'is not', null)
      .limit(1)
      .executeTakeFirst();
    if (clicked) return 'Goal met: they clicked an email in this sequence. The rest was skipped.';
  }

  if (conditions.includes('opened_any_email')) {
    const opened = await trx
      .selectFrom('workflow_runs')
      .select('id')
      .where('tenant_id', '=', ctx.tenantId)
      .where('enrollment_id', '=', ctx.enrollmentId)
      .where('opened_at', 'is not', null)
      .limit(1)
      .executeTakeFirst();
    if (opened) return 'Goal met: they opened an email in this sequence. The rest was skipped.';
  }

  return null;
}
