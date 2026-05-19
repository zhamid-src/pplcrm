import { z } from 'zod';
import { nameSchema, optionalNameSchema, descriptionSchema } from './core.schema';

export const AddTagObj = z.object({
  name: nameSchema('Tag name', 50),
  description: descriptionSchema(500),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Colour must be a hex value like #ff0000')
    .nullable()
    .optional(),
});

export const UpdateTagObj = z.object({
  name: optionalNameSchema('Tag name', 50),
  description: descriptionSchema(500),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Colour must be a hex value like #ff0000')
    .nullable()
    .optional(),
});
