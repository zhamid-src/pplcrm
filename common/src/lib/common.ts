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

export interface INow {
  now: string;
}

export interface IAuthKeyPayload {
  name: string;
  session_id: string;
  tenant_id: bigint;
  user_id: bigint;
}

export const signUpInputObj = z.object({
  organization: z.string(),
  email: z.string().max(100),
  password: z.string().min(8).max(72),
  first_name: z.string().max(100),
});
export type signUpInputType = z.infer<typeof signUpInputObj>;

export const signInInputObj = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type signInInputType = z.infer<typeof signInInputObj>;
