import { z } from 'zod';
import { emailSchema, nameSchema } from './core.schema';

export const InviteAuthUserObj = z.object({
  email: emailSchema,
  first_name: nameSchema('First name'),
  last_name: nameSchema('Last name').nullable().optional(),
  role: z.string().max(100).nullable().optional(),
});

export const UpdateAuthUserObj = z.object({
  email: emailSchema.optional(),
  first_name: nameSchema('First name').optional(),
  last_name: nameSchema('Last name').nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  verified: z.boolean().optional(),
  two_factor_enabled: z.boolean().optional(),
});

export const Verify2FAObj = z.object({
  email: emailSchema,
  code: z.string().length(6),
});

