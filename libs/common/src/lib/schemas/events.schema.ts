import { z } from 'zod';
import { nameSchema, idSchema, descriptionSchema, notesSchema } from './core.schema';

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^(?=.*[a-z])[a-z0-9-]+$/,
    'Slug must contain at least one letter and can only contain lowercase letters, numbers, and hyphens',
  );

export const AddEventObj = z.object({
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
  slug: slugSchema,
  is_published: z.boolean().default(false).optional(),
  send_reminder: z.boolean().default(true).optional(),
  send_registration_confirmation: z.boolean().default(true).optional(),
});

export const EventObj = z.object({
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
  slug: z.string(),
  is_published: z.boolean(),
  send_reminder: z.boolean(),
  send_registration_confirmation: z.boolean(),
});

export const UpdateEventObj = z.object({
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
  slug: slugSchema.optional(),
  is_published: z.boolean().optional(),
  send_reminder: z.boolean().optional(),
  send_registration_confirmation: z.boolean().optional(),
});

export const AddTicketTypeObj = z.object({
  event_id: idSchema,
  name: nameSchema('Ticket type name', 100),
  description: descriptionSchema(500),
  price_cents: z.number().int().min(0, 'Price cannot be negative').default(0),
  capacity: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().min(0).default(0).optional(),
});

export const TicketTypeObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  event_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  price_cents: z.number(),
  capacity: z.number().nullable().optional(),
  sort_order: z.number(),
});

export const UpdateTicketTypeObj = z.object({
  name: nameSchema('Ticket type name', 100).optional(),
  description: descriptionSchema(500),
  price_cents: z.number().int().min(0, 'Price cannot be negative').optional(),
  capacity: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const registrationStatusEnum = z.enum(['registered', 'attended', 'no_show', 'cancelled']);

export const AddRegistrationObj = z.object({
  event_id: idSchema,
  person_id: idSchema,
  ticket_type_id: idSchema.nullable().optional(),
  status: registrationStatusEnum.default('registered').optional(),
  notes: notesSchema,
});

export const RegistrationObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  event_id: z.string(),
  person_id: z.string(),
  ticket_type_id: z.string().nullable().optional(),
  status: registrationStatusEnum,
  checked_in_at: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdateRegistrationObj = z.object({
  ticket_type_id: idSchema.nullable().optional(),
  status: registrationStatusEnum.optional(),
  checked_in_at: z.coerce.date().nullable().optional(),
  notes: notesSchema,
});
