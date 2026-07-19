import { z } from 'zod';
import { idSchema, notesSchema } from './core.schema';

export const RELATION_TYPES = [
  'referred_by',
  'referred_to',
  'close_friend',
  'family_member',
  'spouse',
  'colleague',
  'org_affiliation',
  'introduced_by',
  'introduced_to',
  'custom',
] as const;

export const RELATION_TYPE_LABELS: Record<(typeof RELATION_TYPES)[number], string> = {
  referred_by: 'Referred By',
  referred_to: 'Referred To',
  close_friend: 'Close Friend',
  family_member: 'Family Member',
  spouse: 'Spouse / Partner',
  colleague: 'Colleague',
  org_affiliation: 'Org. Affiliation',
  introduced_by: 'Introduced By',
  introduced_to: 'Introduced To',
  custom: 'Custom',
};

export const relationTypeSchema = z.enum(RELATION_TYPES);

export const AddConnectionObj = z.object({
  to_person_id: idSchema,
  relation_type: relationTypeSchema,
  custom_label: z.string().trim().min(1).max(100).nullable().optional(),
  is_mutual: z.boolean().default(false).optional(),
  notes: notesSchema,
});

export type AddConnectionType = z.infer<typeof AddConnectionObj>;
