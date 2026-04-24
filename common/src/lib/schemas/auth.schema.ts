import { z } from 'zod';

export const InviteAuthUserObj = z.object({
  email: z.string().max(320).email(),
  first_name: z.string().max(100),
  last_name: z.string().max(100).nullable().optional(),
  role: z.string().max(100).nullable().optional(),
});

export const UpdateAuthUserObj = z.object({
  email: z.string().max(320).email().optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  verified: z.boolean().optional(),
});
