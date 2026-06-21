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
  fields: z.array(z.string()).nullable().optional(),
  status: z.enum(['active', 'archived']).default('active').optional(),
  send_confirmation: z.boolean().default(true).optional(),
  send_alert: z.boolean().default(true).optional(),
  form_type: z.enum(['standard', 'donation']).default('standard').optional(),
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
  fields: z.array(z.string()).nullable().optional(),
  status: z.enum(['active', 'archived']).optional(),
  send_confirmation: z.boolean().optional(),
  send_alert: z.boolean().optional(),
});

export const WebFormsObj = z.object({
  id: z.string().uuid(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  redirect_url: z.string().nullable(),
  target_tags: z.array(z.string()).nullable(),
  target_lists: z.array(z.string()).nullable(),
  fields: z.array(z.string()).nullable().optional(),
  status: z.enum(['active', 'archived']),
  send_confirmation: z.boolean().default(true),
  send_alert: z.boolean().default(true),
  form_type: z.string(),
  createdby_id: z.string(),
  updatedby_id: z.string(),
  created_at: z.union([z.date(), z.string()]),
  updated_at: z.union([z.date(), z.string()]),
});
