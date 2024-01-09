/* eslint-disable @typescript-eslint/no-unused-vars */
import { signInInputObj, signUpInputObj } from '@common';
import z from 'zod';
import { authProcedure, publicProcedure, router } from '../../trpc';
import { AuthHelper } from '../trpc.helper/auth.helper';

const helper = new AuthHelper();

export const AuthRouter = router({
  signUp: publicProcedure.input(signUpInputObj).mutation(async ({ input }) => helper.signUp(input)),
  signIn: publicProcedure.input(signInInputObj).mutation(async ({ input }) => helper.signIn(input)),
  signOut: publicProcedure.mutation(async ({ ctx }) => helper.signOut(ctx.auth)),
  currentUser: authProcedure.query(async ({ ctx }) => helper.currentUser(ctx.auth)),
  resetPassword: publicProcedure
    .input(z.object({ password: z.string(), code: z.string() }))
    .mutation(async ({ input }) => helper.resetPassword(input.password, input.code)),
  sendPasswordResetEmail: publicProcedure
    .input(z.object({ email: z.string() }))
    .mutation(async ({ input }) => helper.sendPasswordResetEmail(input.email)),
  renewAuthToken: publicProcedure
    .input(z.object({ auth_token: z.string(), refresh_token: z.string() }))
    .mutation(async ({ input }) => helper.renewAuthToken(input)),
});
