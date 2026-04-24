import { z } from 'zod';

export const AddTeamObj = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  team_captain_id: z.string().nullable().optional(),
  volunteer_ids: z.array(z.string()).optional(),
});

export const UpdateTeamObj = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  team_captain_id: z.string().nullable().optional(),
  volunteer_ids: z.array(z.string()).optional(),
});
