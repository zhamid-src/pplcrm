import { z } from 'zod';

export const CompanyInputObj = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().trim().max(1000).optional().nullable(),
  website: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  email: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  phone: z.string().trim().max(50).optional().nullable(),
  industry: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(10000).optional().nullable(),
});
