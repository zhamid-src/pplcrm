import { z } from 'zod';

export const AddTagObj = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Colour must be a hex value like #ff0000')
    .nullable()
    .optional(),
});

export const UpdateTagObj = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Colour must be a hex value like #ff0000')
    .nullable()
    .optional(),
});
