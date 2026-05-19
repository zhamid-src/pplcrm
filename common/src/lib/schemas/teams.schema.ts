import { z } from 'zod';
import { nameSchema, optionalNameSchema, descriptionSchema, optionalIdSchema, idSchema } from './core.schema';

export const AddTeamObj = z.object({
  name: nameSchema('Name', 100),
  description: descriptionSchema(1000),
  team_captain_id: optionalIdSchema,
  volunteer_ids: z.array(idSchema).optional(),
});

export const UpdateTeamObj = z.object({
  name: optionalNameSchema('Name', 100),
  description: descriptionSchema(1000),
  team_captain_id: optionalIdSchema,
  volunteer_ids: z.array(idSchema).optional(),
});
