import { z } from 'zod';

export type AddTagType = z.infer<typeof AddTagObj>;
export type UpdateHouseholdsType = z.infer<typeof UpdateHouseholdsObj>;
export type UpdatePersonsType = z.infer<typeof UpdatePersonsObj>;
export type UpdateTagType = z.infer<typeof UpdateTagObj>;
export type getAllOptionsType = z.infer<typeof getAllOptions>;
export type signInInputType = z.infer<typeof signInInputObj>;
export type signUpInputType = z.infer<typeof signUpInputObj>;

/**
 * The interface for the data that builds the authkey JWT token.
 * All fields are required
 */
export interface IAuthKeyPayload {
  /**
   * The name of the user that is logged in.
   */
  name: string;
  /**
   * The session ID of the current session
   */
  session_id: string;
  /**
   * The tenant ID of the current user's tenant
   */
  tenant_id: string;
  /**
   * The user ID of the current user
   */
  user_id: string;
}

/**
 * The current authenticated user.
 */
export interface IAuthUser {
  /**
   * The email address of the user that the user registered with
   */
  email: string;
  /**
   * The first name of the user
   */
  first_name: string;
  /**
   * The unique ID that is also used as the primary key in the database.
   */
  id: string;
}

/**
 * Used to get the current time in string from the database
 */
export interface INow {
  now: string;
}

/**
 * The set of auth token and refresh token that are typically used
 * to refresh the authentication token. The given auth token is
 * typically the expired token.
 */
export interface IToken {
  auth_token: string | null;
  refresh_token: string | null;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The list of options that are used to filter the list of rows
 * when getting rows from the database.
 */
export const getAllOptions = z
  .object({
    /**
     * The list of columns to return. If not given then return all columns.
     */
    columns: z.array(z.string()).optional(),
    /**
     * The number of rows to return. If not given then return all rows.
     */
    limit: z.number().optional(),
    /**
     * The offset to start from. If not given then start from the beginning.
     */
    offset: z.number().optional(),
    /**
     * The list of columns to sort by. If not given then don't sort.
     */
    orderBy: z.array(z.string()).optional(),
    /**
     * The list of columns to group by. If not given then don't group.
     */
    groupBy: z.array(z.string()).optional(),
  })
  .optional();
/**
 * The list of objects that are required to create a new
 * user. All fields are required.
 * @see signUpInputType
 */
export const signUpInputObj = z.object({
  /**
   * The name of the organization that the user belongs to.
   * This is the new organization.
   */
  organization: z.string(),
  /**
   * The email address of the user that the user will register with.
   * This is the new user's email address. It should be unique.
   */
  email: z.string().max(100),
  /**
   * The password of the user that the user will register with.
   * It should be at least 8 characters long and at most 72 characters.
   * It should also not be found in any previous data leaks.
   */
  password: z.string().min(8).max(72),
  /**
   * The first name of the user that the user will register with.
   */
  first_name: z.string().max(100),
});
/**
 * The list of objects that are required to login a user.
 */
export const signInInputObj = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
/**
 * The list of objects that are required to create a new
 * tag.
 */
export const AddTagObj = z.object({
  /**
   * The tag to add.
   *
   * Example: Supporter, Donor, Volunteer, etc.
   */
  name: z.string(),
  /**
   * The optional field that describes the tag.
   */
  description: z.string().nullable().optional(),
});
/**
 * The parameter for updating a tag.
 * It's used with an ID in the API call that
 * indicates which Tag to update.
 */
export const UpdateTagObj = AddTagObj.optional();
/**
 * The parameter for updating a person.
 * It's used with an ID in the API call that
 * indicates which Person to update.
 */
export const UpdatePersonsObj = z.object({
  household_id: z.string().optional(),
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
export const UpdateHouseholdsObj = z.object({
  street_num: z.string().optional(),
  street: z.string().optional(),
  apt: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
  json: z.string().optional(),
});
