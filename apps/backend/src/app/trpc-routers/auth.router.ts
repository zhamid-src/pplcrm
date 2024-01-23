/* eslint-disable @typescript-eslint/no-unused-vars */
import { signInInputObj, signUpInputObj } from '@common';
import z from 'zod';
import { authProcedure, publicProcedure, router } from '../../trpc';
import { AuthController } from '../controllers/auth.controller';

const controller = new AuthController();

/**
 * AuthRouter endpoints
 */
export const AuthRouter = router({
  signUp: signUp(),
  signIn: signIn(),
  signOut: signOut(),
  currentUser: currentUser(),
  resetPassword: resetPassword(),
  renewAuthToken: renewAuthToken(),
  sendPasswordResetEmail: sendPasswordResetEmail(),
});

function renewAuthToken() {
  return publicProcedure
    .input(z.object({ auth_token: z.string(), refresh_token: z.string() }))
    .mutation(async ({ input }) => controller.renewAuthToken(input));
}

function sendPasswordResetEmail() {
  return publicProcedure
    .input(z.object({ email: z.string() }))
    .mutation(async ({ input }) => controller.sendPasswordResetEmail(input.email));
}

function resetPassword() {
  return publicProcedure
    .input(z.object({ password: z.string(), code: z.string() }))
    .mutation(async ({ input }) => controller.resetPassword(input.password, input.code));
}

function currentUser() {
  return authProcedure.query(async ({ ctx }) => controller.currentUser(ctx.auth!));
}

function signOut() {
  return publicProcedure.mutation(async ({ ctx }) => controller.signOut(ctx.auth!));
}

function signUp() {
  return publicProcedure
    .input(signUpInputObj)
    .mutation(async ({ input }) => controller.signUp(input));
}

function signIn() {
  return publicProcedure
    .input(signInInputObj)
    .mutation(async ({ input }) => controller.signIn(input));
}
