import { z } from 'zod';
import { emailSchema, nameSchema } from './core.schema';

export const InviteAuthUserObj = z.object({
  email: emailSchema,
  first_name: nameSchema('First name'),
  last_name: nameSchema('Last name').nullable().optional(),
  role: z.string().max(100).nullable().optional(),
});

export const NotificationPreferencesObj = z.object({
  mention_in_comment: z.boolean().default(true),
  mention_in_comment_in_app: z.boolean().default(true),
  task_assigned: z.boolean().default(true),
  task_assigned_in_app: z.boolean().default(true),
  task_due: z.boolean().default(true),
  task_due_in_app: z.boolean().default(true),
  person_assigned: z.boolean().default(true),
  person_assigned_in_app: z.boolean().default(true),
  export_ready: z.boolean().default(true),
  export_ready_in_app: z.boolean().default(true),
  import_summary: z.boolean().default(true),
  import_summary_in_app: z.boolean().default(true),
});

export const UpdateAuthUserObj = z.object({
  email: emailSchema.optional(),
  first_name: nameSchema('First name').optional(),
  last_name: nameSchema('Last name').nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  verified: z.boolean().optional(),
  two_factor_enabled: z.boolean().optional(),
  notification_preferences: NotificationPreferencesObj.optional(),
});

export const Verify2FAObj = z.object({
  email: emailSchema,
  code: z.string().length(6),
  rememberMe: z.boolean().optional(),
});
