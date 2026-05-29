import { z } from 'zod';
import { nameSchema, idSchema, descriptionSchema, notesSchema } from './core.schema';

export const AddVolunteerEventObj = z.object({
  name: nameSchema('Event name', 200),
  description: descriptionSchema(2000),
  location_address: z.string().trim().max(500, 'Location address is too long').nullable().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  capacity: z.number().int().positive().nullable().optional(),
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
});

export const UpdateVolunteerEventObj = z.object({
  name: nameSchema('Event name', 200).optional(),
  description: descriptionSchema(2000),
  location_address: z.string().trim().max(500, 'Location address is too long').nullable().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  capacity: z.number().int().positive().nullable().optional(),
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
