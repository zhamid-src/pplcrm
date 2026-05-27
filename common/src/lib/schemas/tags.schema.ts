import { z } from 'zod';
import { nameSchema, descriptionSchema } from './core.schema';

export const AddTagObj = z.object({
  name: nameSchema('Tag name', 50),
  description: descriptionSchema(500),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Colour must be a hex value like #ff0000')
    .nullable()
    .optional(),
  type: z.enum(['tag', 'issue']).default('tag').optional(),
});

export const UpdateTagObj = z.object({
  name: nameSchema('Tag name', 50).optional(),
  description: descriptionSchema(500).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Colour must be a hex value like #ff0000')
    .nullable()
    .optional(),
  type: z.enum(['tag', 'issue']).optional(),
});
