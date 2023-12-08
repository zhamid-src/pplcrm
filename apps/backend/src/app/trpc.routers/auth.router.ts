import {
  AuthResponse,
  SignInWithPasswordCredentials,
} from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "../../supabase";
import { trpc } from "../../trpc";

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

export const authRouter = router({
  signUp: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(8) }))
    .mutation((data) => signUpHelper(data.input)),

  signIn: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(8) }))
    .mutation((data) => signInHelper(data.input)),

  signOut: publicProcedure.mutation(() => {
    return supabase.auth.signOut();
  }),
});

async function signUpHelper(
  credentials: SignInWithPasswordCredentials,
): Promise<IAuthUser> {
  const payload = await supabase.auth.signUp(credentials);
  return mapPayloadToUser(payload);
}

async function signInHelper(
  credentials: SignInWithPasswordCredentials,
): Promise<IAuthUser> {
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
  return message === "Invalid login"
    ? AuthErrors.BadLogin
    : message === "Email not confirmed"
      ? AuthErrors.EmailNotConfirmed
      : message === "User already registered"
        ? AuthErrors.UserAlreadyRegistered
        : message === "Invalid Refresh Token"
          ? AuthErrors.InvalidRefreshToken
          : message === "This endpoint requires a Bearer token"
            ? AuthErrors.AdminTokenRequired
            : message === "Invalid token"
              ? AuthErrors.AdminTokenRequired
              : message?.indexOf("phone") ||
                  message?.indexOf("Phone") ||
                  message?.indexOf("email") ||
                  message?.indexOf("Email") ||
                  message?.indexOf("provide")
                ? AuthErrors.MissingInformation
                : message?.indexOf("password")
                  ? AuthErrors.BadPassword
                  : AuthErrors.Unknown;
}

export type AuthRouter = typeof authRouter;
