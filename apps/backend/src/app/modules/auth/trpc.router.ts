/**
 * tRPC router defining authentication-related procedures such as
 * sign-up, sign-in, token renewal, and password reset flows.
 */
import { InviteAuthUserObj, UpdateAuthUserObj, Verify2FAObj, getAllOptions, signInInputObj, signUpInputObj, idSchema } from '@common';

import z from 'zod';

import { authProcedure, publicProcedure, router } from '../../../trpc';
import { AuthController } from './controller';

/**
 * Get the currently authenticated user.
 *
 * @returns The current user profile based on the access token.
 */
function currentUser() {
  return authProcedure.query(({ ctx }) => controller.currentUser(ctx.auth));
}

/**
 * Count total auth users for the current tenant.
 */
function count() {
  return authProcedure.query(({ ctx }) => controller.getCount(ctx.auth.tenant_id));
}

/**
 * Retrieve all auth users for the current tenant.
 * Only minimal fields are returned.
 */
function getUsers() {
  return authProcedure.query(
    ({ ctx }) => controller.getAll(ctx.auth.tenant_id, { columns: ['id', 'first_name', 'last_name'] }),
  );
}

/**
 * Retrieve auth users with extended counts data.
 */
function getAllWithCounts() {
  return authProcedure
    .input(getAllOptions)
    .query(({ input, ctx }) => controller.getAllUsers(ctx.auth, input));
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
    .mutation(({ input }) => controller.renewAuthToken(input));
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
    .mutation(({ input }) => controller.resetPassword(input.password, input.code));
}

/**
 * Retrieve a specific auth user by id.
 */
function getById() {
  return authProcedure.input(idSchema).query(({ input, ctx }) => controller.getUserById(ctx.auth, input));
}

/**
 * Send password reset email to user.
 *
 * @input An object containing the user’s `email`.
 * @returns A success message if email exists and reset email was sent.
 */
function sendPasswordResetEmail() {
  return publicProcedure
    .input(z.object({ email: z.string().trim().email('Invalid email address') }))
    .mutation(({ input }) => controller.sendPasswordResetEmail(input.email));
}

/**
 * Sign in an existing user with credentials.
 *
 * @input The credentials schema defined in `signInInputObj`.
 * @returns Access and refresh tokens upon successful login.
 */
function signIn() {
  return publicProcedure.input(signInInputObj).mutation(({ input, ctx }) => {
    const ip = ctx.req?.ip;
    const ua = ctx.req?.headers?.['user-agent'] || '';
    return controller.signIn(input, ip, ua);
  });
}

function verify2FA() {
  return publicProcedure
    .input(Verify2FAObj)
    .mutation(({ input, ctx }) => {
      const ip = ctx.req?.ip;
      const ua = ctx.req?.headers?.['user-agent'] || '';
      return controller.verify2FA(input.email, input.code, ip, ua);
    });
}

function scheduleAccountDeletion() {
  return authProcedure.mutation(({ ctx }) => controller.scheduleAccountDeletion(ctx.auth));
}

function cancelAccountDeletion() {
  return authProcedure.mutation(({ ctx }) => controller.cancelAccountDeletion(ctx.auth));
}

function adminTriggerPasswordReset() {
  return authProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input, ctx }) => controller.adminTriggerPasswordReset(ctx.auth, input.id));
}

/**
 * Invite a new auth user for the tenant.
 */
function invite() {
  return authProcedure
    .input(InviteAuthUserObj)
    .mutation(({ input, ctx }) => controller.inviteUser(ctx.auth, input));
}

/**
 * Sign out the currently authenticated user.
 *
 * @returns A success confirmation.
 */
function signOut() {
  return authProcedure.mutation(({ ctx }) => controller.signOut(ctx.auth));
}

/**
 * Update an existing auth user.
 */
function update() {
  return authProcedure
    .input(z.object({ id: idSchema, data: UpdateAuthUserObj }))
    .mutation(({ input, ctx }) => controller.updateUser(ctx.auth, input.id, input.data));
}

/**
 * Register a new user account.
 *
 * @input The sign-up schema defined in `signUpInputObj`.
 * @returns Access and refresh tokens upon successful registration.
 */
function signUp() {
  return publicProcedure.input(signUpInputObj).mutation(({ input }) => controller.signUp(input));
}

function verifyEmail() {
  return publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(({ input }) => controller.verifyEmail(input.code));
}

function resendVerificationEmail() {
  return publicProcedure
    .input(z.object({ email: z.string().trim().email() }))
    .mutation(({ input }) => controller.resendVerificationEmail(input.email));
}

const controller = new AuthController();

/**
 * AuthRouter endpoints
 *
 * Provides procedures for:
 * - signUp / signIn / signOut
 * - currentUser / getUsers / getAllWithCounts
 * - getById / invite / update / count
 * - resetPassword / renewAuthToken / sendPasswordResetEmail / verifyEmail / resendVerificationEmail
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
  verifyEmail: verifyEmail(),
  resendVerificationEmail: resendVerificationEmail(),
  verify2FA: verify2FA(),
  scheduleAccountDeletion: scheduleAccountDeletion(),
  cancelAccountDeletion: cancelAccountDeletion(),
  adminTriggerPasswordReset: adminTriggerPasswordReset(),
});

