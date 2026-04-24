import { z } from 'zod';
import { getAllOptions } from './core.schema';

export const AddListObj = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  object: z.enum(['people', 'households']),
  is_dynamic: z.boolean().optional(),
  definition: z.lazy(() => getAllOptions).nullable().optional(),
  member_ids: z.array(z.string()).optional(),
});

export const ListsObj = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  object: z.enum(['people', 'households']),
  is_dynamic: z.boolean().optional(),
  definition: z.lazy(() => getAllOptions).nullable().optional(),
});

export const UpdateListObj = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  object: z.enum(['people', 'households']).optional(),
  is_dynamic: z.boolean().optional(),
  definition: z.lazy(() => getAllOptions).nullable().optional(),
});

export const ImportListItemObj = z.object({
  id: z.string(),
  fileName: z.string(),
  source: z.string(),
  tagName: z.string().nullable(),
  tagMissing: z.boolean(),
  createdAt: z.coerce.date(),
  processedAt: z.coerce.date(),
  createdBy: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
  insertedCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  rowCount: z.number().int().nonnegative(),
  householdsCreated: z.number().int().nonnegative(),
  contactCount: z.number().int().nonnegative(),
  householdCount: z.number().int().nonnegative(),
  canDeleteContacts: z.boolean(),
});
