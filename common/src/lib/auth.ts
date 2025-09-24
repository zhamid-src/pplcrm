import { z } from 'zod';

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

export interface IUserStatsSnapshot {
  emails_assigned: {
    total: number;
    open: number;
    closed: number;
  };
  contacts_added: {
    total: number;
    last_created_at: Date | null;
  };
  files_imported: {
    count: number;
    total_rows: number;
    last_activity_at: Date | null;
  };
  files_exported: {
    count: number;
    total_rows: number;
    last_activity_at: Date | null;
  };
}

export interface IAuthUserRecord extends IAuthUser {
  last_name: string;
  role: string | null;
  verified: boolean;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface IAuthUserDetail extends IAuthUserRecord {
  stats: IUserStatsSnapshot;
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

export type signInInputType = z.infer<typeof signInInputObj>;

export type signUpInputType = z.infer<typeof signUpInputObj>;

/**
 * The list of objects that are required to login a user.
 */
export const signInInputObj = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
});

/**
 * The list of objects that are required to create a new
 * user. All fields are required.
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
