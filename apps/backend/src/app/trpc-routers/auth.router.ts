/* eslint-disable @typescript-eslint/no-unused-vars */
import { signInInputObj, signUpInputObj } from '@common';
import z from 'zod';
import { authProcedure, publicProcedure, router } from '../../trpc';
import { AuthController } from '../controllers/auth.controller';

const controller = new AuthController();

export const AuthRouter = router({
  signUp: publicProcedure
    .input(signUpInputObj)
    .mutation(async ({ input }) => controller.signUp(input)),
  signIn: publicProcedure
    .input(signInInputObj)
    .mutation(async ({ input }) => controller.signIn(input)),
  signOut: publicProcedure.mutation(async ({ ctx }) => controller.signOut(ctx.auth!)),
  currentUser: authProcedure.query(async ({ ctx }) => controller.currentUser(ctx.auth!)),
  resetPassword: publicProcedure
    .input(z.object({ password: z.string(), code: z.string() }))
    .mutation(async ({ input }) => controller.resetPassword(input.password, input.code)),
  sendPasswordResetEmail: publicProcedure
    .input(z.object({ email: z.string() }))
    .mutation(async ({ input }) => controller.sendPasswordResetEmail(input.email)),
  renewAuthToken: publicProcedure
    .input(z.object({ auth_token: z.string(), refresh_token: z.string() }))
    .mutation(async ({ input }) => controller.renewAuthToken(input)),
});
