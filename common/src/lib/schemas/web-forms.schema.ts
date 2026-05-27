import { z } from 'zod';
import { nameSchema, descriptionSchema } from './core.schema';

export const AddWebFormObj = z.object({
  name: nameSchema('Web Form name', 100),
  description: descriptionSchema(500),
  redirect_url: z
    .string()
    .trim()
    .url('Redirect URL must be a valid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
  target_tags: z.array(z.string()).nullable().optional(),
  target_lists: z.array(z.string()).nullable().optional(),
  status: z.enum(['active', 'archived']).default('active').optional(),
});

export const UpdateWebFormObj = z.object({
  name: nameSchema('Web Form name', 100).optional(),
  description: descriptionSchema(500).optional(),
  redirect_url: z
    .string()
    .trim()
    .url('Redirect URL must be a valid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
  target_tags: z.array(z.string()).nullable().optional(),
  target_lists: z.array(z.string()).nullable().optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const WebFormsObj = z.object({
  id: z.string().uuid(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  redirect_url: z.string().nullable(),
  target_tags: z.array(z.string()).nullable(),
  target_lists: z.array(z.string()).nullable(),
  status: z.enum(['active', 'archived']),
  createdby_id: z.string(),
  updatedby_id: z.string(),
  created_at: z.union([z.date(), z.string()]),
  updated_at: z.union([z.date(), z.string()]),
});
