import { z } from 'zod';
import { phoneSchema, notesSchema, idSchema, nullableEmailSchema, addressSchema } from './core.schema';

/**
 * Do-not-contact channels (Campaigns §15). The flag lives on the person — it is a
 * global compliance override, never a per-campaign preference. A null/absent
 * channel list means "no contact on any channel".
 */
export const DNC_CHANNELS = ['email', 'phone', 'door'] as const;
export type DncChannel = (typeof DNC_CHANNELS)[number];

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
  linkedin: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  preferred_contact: z.string().nullable().optional(),
});

export const UpdateHouseholdsObj = addressSchema.extend({
  home_phone: phoneSchema('Home phone'),
  notes: notesSchema,
});

export const UpdatePersonsObj = z.object({
  campaign_id: idSchema.optional(),
  household_id: idSchema.optional(),
  company_id: idSchema.or(z.literal('')).nullable().optional(),
  email: nullableEmailSchema,
  email2: nullableEmailSchema,
  first_name: z.string().trim().max(100, 'First name is too long').nullable().optional(),
  middle_names: z.string().trim().max(100, 'Middle names are too long').nullable().optional(),
  last_name: z.string().trim().max(100, 'Last name is too long').nullable().optional(),
  home_phone: phoneSchema('Home phone'),
  mobile: phoneSchema('Mobile phone'),
  notes: notesSchema,
  linkedin: z.string().trim().max(255, 'LinkedIn URL is too long').nullable().optional(),
  twitter: z.string().trim().max(255, 'Twitter URL is too long').nullable().optional(),
  facebook: z.string().trim().max(255, 'Facebook URL is too long').nullable().optional(),
  instagram: z.string().trim().max(255, 'Instagram URL is too long').nullable().optional(),
  assigned_to: idSchema.or(z.literal('')).nullable().optional(),
  preferred_contact: z.string().trim().max(20, 'Preferred contact is too long').nullable().optional(),
  do_not_contact: z.boolean().optional(),
  do_not_contact_channels: z.array(z.enum(DNC_CHANNELS)).nullable().optional(),
});
