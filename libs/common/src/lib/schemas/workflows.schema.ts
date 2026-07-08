import { z } from 'zod';
import { queryBuilderNodeSchema } from './core.schema';

// Spec §16 Automations — the trigger picker's 12 cards. `volunteer_signup` is kept for
// backward compatibility with the pre-rebuild volunteer onboarding trigger (fired from the
// volunteer-events controller) but is not offered as a card.
export const WORKFLOW_TRIGGER_TYPES = [
  'manual',
  'web_form_submitted',
  'contact_created',
  'tag_added',
  'list_joined',
  'donation_recorded',
  'payment_event',
  'volunteer_shift_status',
  'task_sla_breach',
  'new_subscriber',
  'new_unsubscriber',
  'date_arrives',
  'volunteer_signup',
] as const;

export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPES)[number];

const triggerTypeSchema = z.enum(WORKFLOW_TRIGGER_TYPES);

// Spec §16 sequence editor — the five step kinds offered by the ADD A STEP menu.
export const WORKFLOW_STEP_KINDS = ['wait', 'send_email', 'add_tag', 'create_task', 'notify_team'] as const;

export type WorkflowStepKind = (typeof WORKFLOW_STEP_KINDS)[number];

const stepKindSchema = z.enum(WORKFLOW_STEP_KINDS);

// Per-kind config payload (persisted to workflow_steps.config as jsonb). Every field is optional
// at the schema boundary; the controller maps each kind's meaningful fields when executing.
export const WorkflowStepConfigObj = z
  .object({
    // add_tag
    tag_id: z.string().nullable().optional(),
    tag_name: z.string().nullable().optional(),
    // create_task
    task_title: z.string().nullable().optional(),
    // notify_team
    notify_user_id: z.string().nullable().optional(),
    notify_user_name: z.string().nullable().optional(),
    notify_message: z.string().nullable().optional(),
  })
  .strict();

export type WorkflowStepConfigType = z.infer<typeof WorkflowStepConfigObj>;

export const WorkflowObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  trigger_type: triggerTypeSchema.default('manual'),
  trigger_event_id: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
  conditions: queryBuilderNodeSchema.nullable().optional(),
  createdby_id: z.string(),
  updatedby_id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const AddWorkflowObj = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().nullable().optional(),
  trigger_type: triggerTypeSchema.default('manual'),
  trigger_event_id: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'paused']).default('draft').optional(),
  conditions: queryBuilderNodeSchema.nullable().optional(),
});

export const UpdateWorkflowObj = AddWorkflowObj.partial();

export type AddWorkflowType = z.infer<typeof AddWorkflowObj>;
export type UpdateWorkflowType = z.infer<typeof UpdateWorkflowObj>;

export const WorkflowStepObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  workflow_id: z.string(),
  step_number: z.number().int().positive(),
  kind: stepKindSchema,
  config: WorkflowStepConfigObj.nullable().optional(),
  delay_days: z.number().int().nonnegative(),
  delay_unit: z.enum(['days', 'hours']).default('days'),
  subject: z.string().nullable().optional(),
  preview_text: z.string().nullable().optional(),
  html_content: z.string().nullable().optional(),
  plain_text_content: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

// Input shape for saveSteps — order is implied by array position, so no step_number here.
export const AddWorkflowStepObj = z.object({
  kind: stepKindSchema,
  config: WorkflowStepConfigObj.nullable().optional(),
  delay_days: z.number().int().nonnegative().default(0),
  delay_unit: z.enum(['days', 'hours']).default('days'),
  subject: z.string().nullable().optional(),
  preview_text: z.string().nullable().optional(),
  html_content: z.string().nullable().optional(),
  plain_text_content: z.string().nullable().optional(),
});

export const UpdateWorkflowStepObj = AddWorkflowStepObj.partial();

export type AddWorkflowStepType = z.infer<typeof AddWorkflowStepObj>;
export type UpdateWorkflowStepType = z.infer<typeof UpdateWorkflowStepObj>;

export const WorkflowEnrollmentObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  workflow_id: z.string(),
  person_id: z.string(),
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
  current_step_number: z.number().int().nonnegative(),
  next_run_at: z.coerce.date().nullable().optional(),
  enrolled_at: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const WorkflowRunObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  workflow_id: z.string(),
  enrollment_id: z.string().nullable().optional(),
  person_id: z.string().nullable().optional(),
  step_number: z.number().int().nullable().optional(),
  step_kind: z.string().nullable().optional(),
  status: z.enum(['success', 'failed']),
  error: z.string().nullable().optional(),
  created_at: z.coerce.date(),
});

export type WorkflowRunType = z.infer<typeof WorkflowRunObj>;
