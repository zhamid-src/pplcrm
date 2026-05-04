import { z } from 'zod';

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
  home_phone: z.string().nullish(),
  street_num: z.string().nullish(),
  street1: z.string().nullish(),
  street2: z.string().nullish(),
  apt: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  zip: z.string().nullish(),
  country: z.string().nullish(),
  notes: z.string().nullish(),
  json: z.string().nullish(),
});

export const UpdatePersonsObj = z.object({
  campaign_id: z.string().optional(),
  household_id: z.string().optional(),
  email: z.string().optional(),
  email2: z.string().optional(),
  first_name: z.string().optional(),
  middle_names: z.string().optional(),
  last_name: z.string().optional(),
  home_phone: z.string().optional(),
  mobile: z.string().optional(),
  notes: z.string().optional(),
  json: z.string().optional(),
});
