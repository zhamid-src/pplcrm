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
  campaign_id: z.union([z.string().regex(/^\d+$/), z.literal('')]).nullish(),
  household_id: z.union([z.string().regex(/^\d+$/), z.literal('')]).nullish(),
  email: z.union([z.string().trim().email('Invalid email address'), z.literal('')]).nullish(),
  email2: z.union([z.string().trim().email('Invalid email address'), z.literal('')]).nullish(),
  first_name: z.string().trim().max(100, 'First name is too long').nullish(),
  middle_names: z.string().trim().max(100, 'Middle names are too long').nullish(),
  last_name: z.string().trim().max(100, 'Last name is too long').nullish(),
  home_phone: z.string().trim().max(30, 'Home phone is too long').nullish(),
  mobile: z.string().trim().max(30, 'Mobile phone is too long').nullish(),
  notes: z.string().trim().max(10000, 'Notes are too long').nullish(),
  json: z.string().trim().max(50000, 'JSON is too long').nullish(),
});
