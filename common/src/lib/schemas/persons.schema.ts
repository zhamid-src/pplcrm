import { z } from 'zod';
import { phoneSchema, notesSchema, jsonSchema, idSchema, nullableEmailSchema, addressSchema } from './core.schema';

export const PersonsObj = z.object({
  id: z.string(),
  household_id: z.string(),
  email: z.string(),
  email2: z.string(),
  first_name: z.string(),
  middle_names: z.string(),
  last_name: z.string(),
  home_phone: z.string(),
  mobile: z.string(),
  notes: z.string(),
  json: z.string(),
});

export const UpdateHouseholdsObj = addressSchema.extend({
  home_phone: phoneSchema('Home phone'),
  notes: notesSchema,
  json: jsonSchema,
});

export const UpdatePersonsObj = z.object({
  campaign_id: idSchema.optional(),
  household_id: idSchema.optional(),
  company_id: idSchema.optional().nullable(),
  email: nullableEmailSchema,
  email2: nullableEmailSchema,
  first_name: z.string().trim().max(100, 'First name is too long').nullable().optional(),
  middle_names: z.string().trim().max(100, 'Middle names are too long').nullable().optional(),
  last_name: z.string().trim().max(100, 'Last name is too long').nullable().optional(),
  home_phone: phoneSchema('Home phone'),
  mobile: phoneSchema('Mobile phone'),
  notes: notesSchema,
  json: jsonSchema,
});
