/**
 * tRPC router defining authentication-related procedures such as
 * sign-up, sign-in, token renewal, and password reset flows.
 */
import { InviteAuthUserObj, UpdateAuthUserObj, getAllOptions, signInInputObj, signUpInputObj } from '@common';

import z from 'zod';

import { authProcedure, publicProcedure, router } from '../../../trpc';
import { AuthController } from './controller';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';

/**
 * Get the currently authenticated user.
 *
 * @returns The current user profile based on the access token.
 */
function currentUser() {
  return authProcedure.query(wrapTrpc(({ ctx }) => controller.currentUser(ctx.auth)));
}

/**
 * Count total auth users for the current tenant.
 */
function count() {
  return authProcedure.query(wrapTrpc(({ ctx }) => controller.getCount(ctx.auth.tenant_id)));
}

/**
 * Retrieve all auth users for the current tenant.
 * Only minimal fields are returned.
 */
function getUsers() {
  return authProcedure.query(
    wrapTrpc(({ ctx }) => controller.getAll(ctx.auth.tenant_id, { columns: ['id', 'first_name'] })),
  );
}

/**
 * Retrieve auth users with extended counts data.
 */
function getAllWithCounts() {
  return authProcedure
    .input(getAllOptions)
    .query(wrapTrpc(({ input, ctx }) => controller.getAllUsers(ctx.auth, input)));
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
    .mutation(wrapTrpc(({ input }) => controller.renewAuthToken(input)));
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
    .mutation(wrapTrpc(({ input }) => controller.resetPassword(input.password, input.code)));
}

/**
 * Retrieve a specific auth user by id.
 */
function getById() {
  return authProcedure.input(z.string()).query(wrapTrpc(({ input, ctx }) => controller.getUserById(ctx.auth, input)));
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
    .mutation(wrapTrpc(({ input }) => controller.sendPasswordResetEmail(input.email)));
}

/**
 * Sign in an existing user with credentials.
 *
 * @input The credentials schema defined in `signInInputObj`.
 * @returns Access and refresh tokens upon successful login.
 */
function signIn() {
  return publicProcedure.input(signInInputObj).mutation(wrapTrpc(({ input }) => controller.signIn(input)));
}

/**
 * Invite a new auth user for the tenant.
 */
function invite() {
  return authProcedure
    .input(InviteAuthUserObj)
    .mutation(wrapTrpc(({ input, ctx }) => controller.inviteUser(ctx.auth, input)));
}

/**
 * Sign out the currently authenticated user.
 *
 * @returns A success confirmation.
 */
function signOut() {
  return authProcedure.mutation(wrapTrpc(({ ctx }) => controller.signOut(ctx.auth)));
}

/**
 * Update an existing auth user.
 */
function update() {
  return authProcedure
    .input(z.object({ id: z.string(), data: UpdateAuthUserObj }))
    .mutation(wrapTrpc(({ input, ctx }) => controller.updateUser(ctx.auth, input.id, input.data)));
}

/**
 * Register a new user account.
 *
 * @input The sign-up schema defined in `signUpInputObj`.
 * @returns Access and refresh tokens upon successful registration.
 */
function signUp() {
  return publicProcedure.input(signUpInputObj).mutation(wrapTrpc(({ input }) => controller.signUp(input)));
}

const controller = new AuthController();

/**
 * AuthRouter endpoints
 *
 * Provides procedures for:
 * - signUp / signIn / signOut
 * - currentUser / getUsers / getAllWithCounts
 * - getById / invite / update / count
 * - resetPassword / renewAuthToken / sendPasswordResetEmail
 */
export const AuthRouter = router({
  signUp: signUp(),
  signIn: signIn(),
  signOut: signOut(),
  currentUser: currentUser(),
  getUsers: getUsers(),
  getAllWithCounts: getAllWithCounts(),
  getById: getById(),
  invite: invite(),
  update: update(),
  count: count(),
  resetPassword: resetPassword(),
  renewAuthToken: renewAuthToken(),
  sendPasswordResetEmail: sendPasswordResetEmail(),
});
