/* eslint-disable @typescript-eslint/no-unused-vars */
import z from "zod";
import { authProcedure, publicProcedure, router } from "../../trpc";
import {
  AuthHelper,
  signInInputObj,
  signUpInputObj,
} from "../trpc.handler/auth.helper";

const authHelper = new AuthHelper();

export const authRouter = router({
  signUp: publicProcedure
    .input(signUpInputObj)
    .mutation(async ({ input }) => authHelper.signUp(input)),
  signIn: publicProcedure
    .input(signInInputObj)
    .mutation(async ({ input }) => authHelper.signIn(input)),
  signOut: publicProcedure.mutation(async ({ ctx }) =>
    authHelper.signOut(ctx.auth),
  ),
  currentUser: authProcedure.query(async ({ ctx }) =>
    authHelper.currentUser(ctx.auth),
  ),
  resetPassword: publicProcedure
    .input(z.object({ password: z.string(), code: z.string() }))
    .mutation(async ({ input }) =>
      authHelper.resetPassword(input.password, input.code),
    ),
  sendPasswordResetEmail: publicProcedure
    .input(z.object({ email: z.string() }))
    .mutation(async ({ input }) =>
      authHelper.sendPasswordResetEmail(input.email),
    ),
});
export type AuthRouter = typeof authRouter;
