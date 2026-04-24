import { z } from 'zod';

export const SettingsObj = z.object({
  id: z.string().optional(),
  tenant_id: z.string().optional(),
  campaign_id: z.string().optional(),
  createdby_id: z.string().optional(),
  updatedby_id: z.string().optional(),
  key: z.string().optional(),
  value: z.unknown().optional(),
});

export const SettingsEntryObj = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const UpsertSettingsInputObj = z.object({
  entries: z.array(SettingsEntryObj).min(1),
});
