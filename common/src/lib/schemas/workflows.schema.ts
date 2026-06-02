import { z } from 'zod';

export const WorkflowObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  trigger_type: z
    .enum([
      'volunteer_signup',
      'manual',
      'tag_added',
      'web_form_submitted',
      'volunteer_shift_status',
      'contact_created',
      'list_joined',
      'payment_event',
      'new_subscriber',
      'new_unsubscriber',
    ])
    .default('manual'),
  trigger_event_id: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
  createdby_id: z.string(),
  updatedby_id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const AddWorkflowObj = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().nullable().optional(),
  trigger_type: z
    .enum([
      'volunteer_signup',
      'manual',
      'tag_added',
      'web_form_submitted',
      'volunteer_shift_status',
      'contact_created',
      'list_joined',
      'payment_event',
      'new_subscriber',
      'new_unsubscriber',
    ])
    .default('manual'),
  trigger_event_id: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'paused']).default('draft').optional(),
});

export const UpdateWorkflowObj = AddWorkflowObj.partial();

export type AddWorkflowType = z.infer<typeof AddWorkflowObj>;
export type UpdateWorkflowType = z.infer<typeof UpdateWorkflowObj>;

export const WorkflowStepObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  workflow_id: z.string(),
  step_number: z.number().int().positive(),
  delay_days: z.number().int().nonnegative(),
  delay_unit: z.enum(['days', 'hours']).default('days'),
  subject: z.string().min(1, 'Subject is required'),
  preview_text: z.string().nullable().optional(),
  html_content: z.string().nullable().optional(),
  plain_text_content: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const AddWorkflowStepObj = z.object({
  step_number: z.number().int().positive(),
  delay_days: z.number().int().nonnegative(),
  delay_unit: z.enum(['days', 'hours']).default('days').optional(),
  subject: z.string().min(1, 'Subject is required'),
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
