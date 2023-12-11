import * as common from "@common";
import {
  AuthResponse,
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
} from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "../../supabase";
import { trpc } from "../../trpc";
import { TenantsOperator } from "../db.operators/tenants.operator";
import { UsersOperator } from "../db.operators/users.operator";

const publicProcedure = trpc.procedure;
const router = trpc.router;

const tenants: TenantsOperator = new TenantsOperator();
const users: UsersOperator = new UsersOperator();

const signupInputObj = z.object({
  organization: z.string(),
  email: z.string().max(100),
  password: z.string().min(8).max(72),
  first_name: z.string().max(100),
  middle_names: z.string().nullable(),
  last_name: z.string().nullable(),
});

type signupInputType = z.infer<typeof signupInputObj>;

const signinInputObj = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authRouter = router({
  signUp: publicProcedure
    .input(signupInputObj)
    .mutation((data) => signUpHelper(data.input)),

  signIn: publicProcedure
    .input(signinInputObj)
    .mutation((data) => signInHelper(data.input)),

  signOut: publicProcedure.mutation(() => supabase.auth.signOut()),

  resetPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation((data) =>
      supabase.auth.resetPasswordForEmail(data.input.email, {
        redirectTo: "http://localhost:4200/newpassword/",
      }),
    ),

  newPassword: publicProcedure
    .input(
      z.object({
        password: z.string().min(8).max(100),
        refresh_token: z.string(),
      }),
    )
    .mutation((data) =>
      newPassword(data.input.password, data.input.refresh_token),
    ),
});

async function newPassword(password: string, refresh_token: string) {
  const payload: AuthResponse = await supabase.auth.refreshSession({
    refresh_token,
  });

  if (!payload || payload.error || !payload.data?.user) {
    throw payload.error;
  }

  return supabase.auth.updateUser({ password });
}

async function signUpHelper(input: signupInputType): Promise<common.IAuthUser> {
  // TODO: should be a transaction

  // First, add tenant
  const tenantAddResult = await tenants.add({ name: input.organization });
  const tenant_id = tenantAddResult?.id;

  // Now create a new user in auth
  const credentials: SignUpWithPasswordCredentials = {
    email: input.email,
    password: input.password,
    options: { data: { tenant_id } },
  };
  const payload = await supabase.auth.signUp(credentials);
  const authUser = payload?.data?.user;

  if (authUser) {
    await users.add({
      tenant_id,
      uid: authUser.id,
      email: authUser.email,
      first_name: input.first_name,
      last_name: input.last_name,
      middle_names: input.middle_names,
    });
  }
  return mapPayloadToUser(payload);
}

async function signInHelper(
  credentials: SignInWithPasswordCredentials,
): Promise<common.IAuthUser> {
  const payload = await supabase.auth.signInWithPassword(credentials);
  return mapPayloadToUser(payload);
}

function mapPayloadToUser(payload: AuthResponse): common.IAuthUser {
  return {
    user: payload?.data?.user,
    session: payload?.data?.session,
    error:
      payload?.error || !payload?.data?.user
        ? mapErrorMsgToCode(payload?.error?.message)
        : null,
  };
}

function mapErrorMsgToCode(message: string | undefined): common.AuthErrors {
  if (
    message?.indexOf("phone") ||
    message?.indexOf("Phone") ||
    message?.indexOf("email") ||
    message?.indexOf("Email") ||
    message?.indexOf("provide")
  ) {
    return common.AuthErrors.MissingInformation;
  }

  if (message?.indexOf("password")) {
    return common.AuthErrors.BadPassword;
  }

  switch (message) {
    case "Invalid login":
      return common.AuthErrors.BadLogin;
    case "Email not confirmed":
      return common.AuthErrors.EmailNotConfirmed;
    case "User already registered":
      return common.AuthErrors.UserAlreadyRegistered;
    case "Invalid Refresh Token":
      return common.AuthErrors.InvalidRefreshToken;
    case "This endpoint requires a Bearer token":
      return common.AuthErrors.AdminTokenRequired;
    case "Invalid token":
      return common.AuthErrors.AdminTokenRequired;
    default:
      return common.AuthErrors.Unknown;
  }
}

export type AuthRouter = typeof authRouter;
