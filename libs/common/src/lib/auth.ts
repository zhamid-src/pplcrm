import { z } from 'zod';

export interface IAuthKeyPayload {
  name: string;

  session_id: string;

  tenant_id: string;

  user_id: string;

  role?: string | null;

  source?: string;
}

export interface IAuthUser {
  email: string;

  first_name: string;

  last_name?: string;

  id: string;

  role?: string | null;

  avatar_url?: string | null;

  tenant_deletion_scheduled_at?: Date | null;

  tenant_paused_at?: Date | null;
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
  two_factor_enabled: boolean;
  deletion_scheduled_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
  previous_email?: string | null;
  previous_role?: string | null;
  avatar_url?: string | null;
  notification_preferences?: {
    mention_in_comment: boolean;
    mention_in_comment_in_app: boolean;
    task_assigned: boolean;
    task_assigned_in_app: boolean;
    task_due: boolean;
    task_due_in_app: boolean;
    person_assigned: boolean;
    person_assigned_in_app: boolean;
    export_ready: boolean;
    export_ready_in_app: boolean;
    import_summary: boolean;
    import_summary_in_app: boolean;
  };
}

export interface IAuthUserDetail extends IAuthUserRecord {
  stats: IUserStatsSnapshot;
}

export interface IToken {
  auth_token: string | null;
  refresh_token: string | null;
}

export type signInInputType = z.infer<typeof signInInputObj>;

export type signUpInputType = z.infer<typeof signUpInputObj>;

export const signInInputObj = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
  rememberMe: z.boolean().optional(),
});

export const signUpInputObj = z.object({
  organization: z.string(),
  email: z.string().max(100),
  password: z.string().min(8).max(72),
  first_name: z.string().max(100),
});
