import { z } from 'zod';
import { phoneSchema, notesSchema, jsonSchema, idSchema, emailSchema } from './core.schema';

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

export const UpdateHouseholdsObj = z.object({
  home_phone: phoneSchema('Home phone'),
  street_num: z.string().trim().max(30, 'Street number is too long').nullish(),
  street1: z.string().trim().max(150, 'Street 1 is too long').nullish(),
  street2: z.string().trim().max(150, 'Street 2 is too long').nullish(),
  apt: z.string().trim().max(30, 'Apt is too long').nullish(),
  city: z.string().trim().max(100, 'City is too long').nullish(),
  state: z.string().trim().max(100, 'State is too long').nullish(),
  zip: z.string().trim().max(20, 'Zip is too long').nullish(),
  country: z.string().trim().max(100, 'Country is too long').nullish(),
  notes: notesSchema,
  json: jsonSchema,
});

export const UpdatePersonsObj = z.object({
  campaign_id: idSchema.optional(),
  household_id: idSchema.optional(),
  email: emailSchema.optional(),
  email2: emailSchema.optional(),
  first_name: z.string().trim().max(100, 'First name is too long').nullish(),
  middle_names: z.string().trim().max(100, 'Middle names are too long').nullish(),
  last_name: z.string().trim().max(100, 'Last name is too long').nullish(),
  home_phone: phoneSchema('Home phone'),
  mobile: phoneSchema('Mobile phone'),
  notes: notesSchema,
  json: jsonSchema,
});
