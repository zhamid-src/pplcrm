import { z } from 'zod';
import { nameSchema, idSchema, descriptionSchema, notesSchema } from './core.schema';

export const AddVolunteerEventObj = z.object({
  name: nameSchema('Event name', 200),
  description: descriptionSchema(2000),
  location_address: z.string().trim().max(500, 'Location address is too long').nullable().optional(),
  start_time: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.date({ error: 'Start date & time is required' }),
  ),
  end_time: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.date({ error: 'End date & time is required' }),
  ),
  capacity: z.number().int().positive().nullable().optional().or(z.literal('')),
  contact_email: z.string().trim().max(255).nullable().optional(),
  contact_phone: z.string().trim().max(50).nullable().optional(),
  is_private: z.boolean().default(false).optional(),
  send_reminder: z.boolean().default(true).optional(),
  send_signup_confirmation: z.boolean().default(true).optional(),
  send_volunteer_alert: z.boolean().default(true).optional(),
  fields: z.array(z.string()).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(
      /^(?=.*[a-z])[a-z0-9-]+$/,
      'Slug must contain at least one letter and can only contain lowercase letters, numbers, and hyphens',
    ),
});

export const VolunteerEventsObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  location_address: z.string().nullable().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  capacity: z.number().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  is_private: z.boolean(),
  send_reminder: z.boolean(),
  send_signup_confirmation: z.boolean().default(true),
  send_volunteer_alert: z.boolean().default(true),
  slug: z.string(),
});

export const UpdateVolunteerEventObj = z.object({
  name: nameSchema('Event name', 200).optional(),
  description: descriptionSchema(2000),
  location_address: z.string().trim().max(500, 'Location address is too long').nullable().optional(),
  start_time: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.date({ error: 'Start date & time is required' }),
    )
    .optional(),
  end_time: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.date({ error: 'End date & time is required' }),
    )
    .optional(),
  capacity: z.number().int().positive().nullable().optional().or(z.literal('')),
  contact_email: z.string().trim().max(255).nullable().optional(),
  contact_phone: z.string().trim().max(50).nullable().optional(),
  is_private: z.boolean().optional(),
  send_reminder: z.boolean().optional(),
  send_signup_confirmation: z.boolean().optional(),
  send_volunteer_alert: z.boolean().optional(),
  fields: z.array(z.string()).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(
      /^(?=.*[a-z])[a-z0-9-]+$/,
      'Slug must contain at least one letter and can only contain lowercase letters, numbers, and hyphens',
    )
    .optional(),
});

export const AddVolunteerShiftObj = z.object({
  event_id: idSchema,
  person_id: idSchema,
  status: z.enum(['signed_up', 'attended', 'no_show', 'cancelled']).default('signed_up').optional(),
  hours_worked: z.number().min(0).max(24).nullable().optional(),
  notes: notesSchema,
});

export const VolunteerShiftsObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  event_id: z.string(),
  person_id: z.string(),
  status: z.enum(['signed_up', 'attended', 'no_show', 'cancelled']),
  hours_worked: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdateVolunteerShiftObj = z.object({
  status: z.enum(['signed_up', 'attended', 'no_show', 'cancelled']).optional(),
  hours_worked: z.number().min(0).max(24).nullable().optional(),
  notes: notesSchema,
});
