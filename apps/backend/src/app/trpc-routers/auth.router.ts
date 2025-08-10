/**
 * tRPC router defining authentication-related procedures such as
 * sign-up, sign-in, token renewal, and password reset flows.
 */
import { signInInputObj, signUpInputObj } from '@common';

import z from 'zod';

import { authProcedure, publicProcedure, router } from '../../trpc';
import { AuthController } from '../controllers/auth.controller';

/**
 * Get the currently authenticated user.
 *
 * @returns The current user profile based on the access token.
 */
function currentUser() {
  return authProcedure.query(async ({ ctx }) => controller.currentUser(ctx.auth));
}

/**
 * Retrieve all auth users for the current tenant.
 * Only minimal fields are returned.
 */
function getUsers() {
  return authProcedure.query(({ ctx }) =>
    controller.getAll(ctx.auth.tenant_id, { columns: ['id', 'first_name'] }),
  );
}

/**
 * Renew access and refresh tokens.
 *
 * @input An object containing `auth_token` and `refresh_token`.
 * @returns A new set of tokens or an error if invalid.
 */
function renewAuthToken() {
  return publicProcedure
    .input(z.object({ auth_token: z.string(), refresh_token: z.string() }))
    .mutation(async ({ input }) => controller.renewAuthToken(input));
}

/**
 * Reset the user’s password using a reset code.
 *
 * @input An object containing the `password` and `code`.
 * @returns A success message or an error if code is invalid/expired.
 */
function resetPassword() {
  return publicProcedure
    .input(z.object({ password: z.string(), code: z.string() }))
    .mutation(async ({ input }) => controller.resetPassword(input.password, input.code));
}

/**
 * Send password reset email to user.
 *
 * @input An object containing the user’s `email`.
 * @returns A success message if email exists and reset email was sent.
 */
function sendPasswordResetEmail() {
  return publicProcedure
    .input(z.object({ email: z.string() }))
    .mutation(async ({ input }) => controller.sendPasswordResetEmail(input.email));
}

/**
 * Sign in an existing user with credentials.
 *
 * @input The credentials schema defined in `signInInputObj`.
 * @returns Access and refresh tokens upon successful login.
 */
function signIn() {
  return publicProcedure.input(signInInputObj).mutation(async ({ input }) => controller.signIn(input));
}

/**
 * Sign out the currently authenticated user.
 *
 * @returns A success confirmation.
 */
function signOut() {
  return publicProcedure.mutation(async ({ ctx }) => controller.signOut(ctx.auth));
}

/**
 * Register a new user account.
 *
 * @input The sign-up schema defined in `signUpInputObj`.
 * @returns Access and refresh tokens upon successful registration.
 */
function signUp() {
  return publicProcedure.input(signUpInputObj).mutation(async ({ input }) => controller.signUp(input));
}

const controller = new AuthController();

/**
 * AuthRouter endpoints
 *
 * Provides procedures for:
 * - signUp
 * - signIn
 * - signOut
 * - currentUser
 * - resetPassword
 * - renewAuthToken
 * - sendPasswordResetEmail
 */
export const AuthRouter = router({
  signUp: signUp(),
  signIn: signIn(),
  signOut: signOut(),
  currentUser: currentUser(),
  getUsers: getUsers(),
  resetPassword: resetPassword(),
  renewAuthToken: renewAuthToken(),
  sendPasswordResetEmail: sendPasswordResetEmail(),
});
