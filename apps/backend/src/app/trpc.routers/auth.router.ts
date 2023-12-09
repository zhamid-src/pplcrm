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

interface IAuthUser {
  // #region Properties (3)

  error: AuthErrors | null;
  session: unknown | null;
  user: unknown | null;

  // #endregion Properties (3)
}

enum AuthErrors {
  BadLogin = 1,
  EmailNotConfirmed,
  InvalidRefreshToken,
  AdminTokenRequired,
  MissingInformation,
  UserAlreadyRegistered,
  BadPassword,
  Unknown,
}

type SignUpFormType = {
  organization: string;
  email: string;
  password: string;
  first_name: string;
  middle_names: string | null;
  last_name: string | null;
  terms: string | null;
};

const tenants: TenantsOperator = new TenantsOperator();
const users: UsersOperator = new UsersOperator();

export const authRouter = router({
  signUp: publicProcedure
    .input(
      z.object({
        organization: z.string(),
        email: z.string(),
        password: z.string(),
        first_name: z.string(),
        middle_names: z.string().nullable(),
        last_name: z.string().nullable(),
      }),
    )
    .mutation((data) => signUpHelper(data.input as SignUpFormType)),

  signIn: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(8) }))
    .mutation((data) => signInHelper(data.input)),

  signOut: publicProcedure.mutation(() => {
    return supabase.auth.signOut();
  }),
});
async function signUpHelper(input: SignUpFormType): Promise<IAuthUser> {
  // TODO: should be a transaction

  // First, add tenant
  const tenantAddResult = await tenants.add({ name: input.organization });
  console.log("tenantAddResult", tenantAddResult);

  const tenantId = tenantAddResult?.id;

  // Now create a new user in auth
  const credentials: SignUpWithPasswordCredentials = {
    email: input.email as string,
    password: input.password as string,
    options: { data: { tenant_id: tenantId } },
  };
  const payload = await supabase.auth.signUp(credentials);
  const authUser = payload?.data?.user;

  if (authUser) {
    await users.add({
      tenant_id: tenantId,
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
): Promise<IAuthUser> {
  console.log("credentials", credentials);
  const payload = await supabase.auth.signInWithPassword(credentials);
  return mapPayloadToUser(payload);
}

function mapPayloadToUser(payload: AuthResponse): IAuthUser {
  return {
    user: payload?.data?.user,
    session: payload?.data?.session,
    error: payload?.data?.user
      ? null
      : mapErrorMsgToCode(payload?.error?.message),
  };
}

function mapErrorMsgToCode(message: string | undefined): AuthErrors {
  if (
    message?.indexOf("phone") ||
    message?.indexOf("Phone") ||
    message?.indexOf("email") ||
    message?.indexOf("Email") ||
    message?.indexOf("provide")
  ) {
    return AuthErrors.MissingInformation;
  }

  if (message?.indexOf("password")) {
    return AuthErrors.BadPassword;
  }

  switch (message) {
    case "Invalid login":
      return AuthErrors.BadLogin;
    case "Email not confirmed":
      return AuthErrors.EmailNotConfirmed;
    case "User already registered":
      return AuthErrors.UserAlreadyRegistered;
    case "Invalid Refresh Token":
      return AuthErrors.InvalidRefreshToken;
    case "This endpoint requires a Bearer token":
      return AuthErrors.AdminTokenRequired;
    case "Invalid token":
      return AuthErrors.AdminTokenRequired;
    default:
      return AuthErrors.Unknown;
  }
}

export type AuthRouter = typeof authRouter;
