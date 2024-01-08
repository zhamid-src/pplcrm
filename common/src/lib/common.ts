import { z } from 'zod';

export type AddTagType = z.infer<typeof AddTagObj>;
export type UpdatePersonsType = z.infer<typeof UpdatePersonsObj>;
export type UpdateTagType = z.infer<typeof UpdateTagObj>;
export type getAllOptionsType = z.infer<typeof getAllOptions>;
export type signInInputType = z.infer<typeof signInInputObj>;
export type signUpInputType = z.infer<typeof signUpInputObj>;

export interface IAuthKeyPayload {
  name: string;
  session_id: string;
  tenant_id: bigint;
  user_id: bigint;
}

export interface IAuthUser {
  email: string;
  first_name: string;
  id: bigint;
}

export interface INow {
  now: string;
}

export interface IToken {
  auth_token: string;
  refresh_token: string;
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
export const signUpInputObj = z.object({
  organization: z.string(),
  email: z.string().max(100),
  password: z.string().min(8).max(72),
  first_name: z.string().max(100),
});
export const signInInputObj = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export const AddTagObj = z.object({
  name: z.string(),
  description: z.string().optional(),
});
export const UpdateTagObj = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});
export const UpdatePersonsObj = z.object({
  household_id: z.bigint().optional(),
  email: z.string().optional(),
  email2: z.string().optional(),
  first_name: z.string().optional(),
  middle_names: z.string().optional(),
  last_name: z.string().optional(),
  home_phone: z.string().optional(),
  mobile: z.string().optional(),
  notes: z.string().optional(),
  json: z.string().optional(),
});
