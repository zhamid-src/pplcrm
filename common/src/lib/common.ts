import { z } from "zod";

export interface IToken {
  auth_token: string;
  refresh_token: string;
}

export interface IAuthUser {
  email: string;
  first_name: string;
  id: number;
}

export const getAllOptions = z
  .object({
    columns: z.array(z.string()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    orderBy: z.array(z.string()).optional(),
    groupBy: z.array(z.string()).optional(),
  })
  .optional();
export type getAllOptionsType = z.infer<typeof getAllOptions>;
