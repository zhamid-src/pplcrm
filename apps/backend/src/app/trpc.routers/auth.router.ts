/* eslint-disable @typescript-eslint/no-unused-vars */
import { publicProcedure, router } from "../../trpc";
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
  currentUser: publicProcedure.query(async ({ ctx }) =>
    authHelper.currentUser(ctx.auth),
  ),
});
export type AuthRouter = typeof authRouter;
