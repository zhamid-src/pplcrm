import { z } from 'zod';
import { nameSchema, descriptionSchema, idSchema } from './core.schema';

export const AddTeamObj = z.object({
  name: nameSchema('Name', 100),
  description: descriptionSchema(1000),
  team_captain_id: idSchema.nullable().optional(),
  team_lead_user_id: idSchema.nullable().optional(),
  volunteer_ids: z.array(idSchema).optional(),
  list_ids: z.array(idSchema).optional(),
});

export const UpdateTeamObj = z.object({
  name: nameSchema('Name', 100).nullable(),
  description: descriptionSchema(1000),
  team_captain_id: idSchema.nullable().optional(),
  team_lead_user_id: idSchema.nullable().optional(),
  volunteer_ids: z.array(idSchema).optional(),
  list_ids: z.array(idSchema).optional(),
});
