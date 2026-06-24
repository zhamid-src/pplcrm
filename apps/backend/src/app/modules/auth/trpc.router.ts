import {
  InviteAuthUserObj,
  Verify2FAObj,
  getAllOptions,
  signInInputObj,
  signUpInputObj,
  idSchema,
  UpdateAuthUserObj,
} from '../../../../../../libs/common/src';

import z from 'zod';

import { authProcedure, adminOrOwnerProcedure, publicProcedure, router } from '../../../trpc';
import { AuthController } from './controller';
import { PasskeyController } from './passkey.controller';
import { checkRateLimit } from '../../lib/rate-limiter';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';

const MIN15 = 15 * 60 * 1000;
const HOUR1 = 60 * 60 * 1000;

function currentUser() {
  return authProcedure.query(({ ctx }) => controller.currentUser(ctx.auth));
}

function count() {
  return adminOrOwnerProcedure.query(({ ctx }) => controller.getCount(ctx.auth.tenant_id));
}

function getAllWithCounts() {
  return adminOrOwnerProcedure.input(getAllOptions).query(({ input, ctx }) => controller.getAllUsers(ctx.auth, input));
}

function getById() {
  return authProcedure.input(idSchema).query(({ input, ctx }) => controller.getUserById(ctx.auth, input));
}

function update() {
  return authProcedure
    .input(z.object({ id: idSchema, data: UpdateAuthUserObj }))
    .mutation(({ input, ctx }) => controller.updateUser(ctx.auth, input.id, input.data));
}

function renewAuthToken() {
  return publicProcedure
    .input(z.object({ auth_token: z.string(), refresh_token: z.string() }))
    .mutation(({ input }) => controller.renewAuthToken(input));
}

function resetPassword() {
  return publicProcedure.input(z.object({ password: z.string(), code: z.string() })).mutation(({ input, ctx }) => {
    const ip = ctx.req?.ip ?? 'unknown';
    checkRateLimit(`${ip}:resetPassword`, 5, MIN15);
    return controller.resetPassword(input.password, input.code);
  });
}

function sendPasswordResetEmail() {
  return publicProcedure
    .input(z.object({ email: z.string().trim().email('Invalid email address') }))
    .mutation(({ input, ctx }) => {
      const ip = ctx.req?.ip ?? 'unknown';
      checkRateLimit(`${ip}:sendPasswordResetEmail`, 3, HOUR1);
      return controller.sendPasswordResetEmail(input.email);
    });
}

function signIn() {
  return publicProcedure.input(signInInputObj).mutation(({ input, ctx }) => {
    const ip = ctx.req?.ip ?? 'unknown';
    checkRateLimit(`${ip}:signIn`, 10, MIN15);
    const ua = ctx.req?.headers?.['user-agent'] || '';
    return controller.signIn(input, ip, ua);
  });
}

function verify2FA() {
  return publicProcedure.input(Verify2FAObj).mutation(({ input, ctx }) => {
    const ip = ctx.req?.ip ?? 'unknown';
    checkRateLimit(`${ip}:verify2FA`, 5, MIN15);
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

function getTenantAccountStatus() {
  return adminOrOwnerProcedure.query(({ ctx }) => controller.getTenantAccountStatus(ctx.auth));
}

function cancelTenantDeletionByToken() {
  return publicProcedure
    .input(z.object({ tenantId: z.string(), token: z.string() }))
    .mutation(({ input }) => controller.cancelTenantDeletionByToken(input.tenantId, input.token));
}

function scheduleTenantDeletion() {
  return adminOrOwnerProcedure.mutation(({ ctx }) => controller.scheduleTenantDeletion(ctx.auth));
}

function cancelTenantDeletion() {
  return adminOrOwnerProcedure.mutation(({ ctx }) => controller.cancelTenantDeletion(ctx.auth));
}

function pauseTenant() {
  return adminOrOwnerProcedure.mutation(({ ctx }) => controller.pauseTenant(ctx.auth));
}

function resumeTenant() {
  return adminOrOwnerProcedure.mutation(({ ctx }) => controller.resumeTenant(ctx.auth));
}

function cancelEmailChange() {
  return authProcedure.mutation(({ ctx }) => controller.cancelEmailChange(ctx.auth));
}

function uploadAvatar() {
  return authProcedure
    .input(
      z.object({
        dataBase64: z.string().min(1),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
        filename: z.string().min(1).max(255),
      }),
    )
    .mutation(({ input, ctx }) => controller.uploadAvatar(ctx.auth, input));
}

function deleteAvatar() {
  return authProcedure.mutation(({ ctx }) => controller.deleteAvatar(ctx.auth));
}

function adminTriggerPasswordReset() {
  return adminOrOwnerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input, ctx }) => controller.adminTriggerPasswordReset(ctx.auth, input.id));
}

function invite() {
  return adminOrOwnerProcedure
    .input(InviteAuthUserObj)
    .mutation(({ input, ctx }) => controller.inviteUser(ctx.auth, input));
}

function signOut() {
  return authProcedure.mutation(({ ctx }) => controller.signOut(ctx.auth));
}

function signUp() {
  return publicProcedure.input(signUpInputObj).mutation(({ input, ctx }) => {
    const ip = ctx.req?.ip ?? 'unknown';
    checkRateLimit(`${ip}:signUp`, 5, HOUR1);
    return controller.signUp(input);
  });
}

function deleteOne() {
  return adminOrOwnerProcedure.input(idSchema).mutation(({ input, ctx }) => controller.deleteUser(ctx.auth, input));
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
const passkeyController = new PasskeyController();

function passkeyRegistrationOptions() {
  return authProcedure.query(({ ctx }) => passkeyController.getRegistrationOptions(ctx.auth));
}

function verifyPasskeyRegistration() {
  return authProcedure
    .input(
      z.object({
        response: z.any().transform((v) => v as RegistrationResponseJSON),
        friendlyName: z.string().max(100).optional(),
      }),
    )
    .mutation(({ input, ctx }) => passkeyController.verifyRegistration(ctx.auth, input.response, input.friendlyName));
}

function passkeyAuthenticationOptions() {
  return publicProcedure.query(() => passkeyController.getAuthenticationOptions());
}

function verifyPasskeyAuthentication() {
  return publicProcedure
    .input(
      z.object({
        response: z.any().transform((v) => v as AuthenticationResponseJSON),
        nonce: z.string(),
      }),
    )
    .mutation(({ input, ctx }) => {
      const ip = ctx.req?.ip ?? 'unknown';
      checkRateLimit(`${ip}:verifyPasskeyAuthentication`, 10, MIN15);
      const ua = ctx.req?.headers?.['user-agent'] ?? '';
      return passkeyController.verifyAuthentication(input.response, input.nonce, ip, ua);
    });
}

function listPasskeys() {
  return authProcedure.query(({ ctx }) => passkeyController.listPasskeys(ctx.auth));
}

function deletePasskey() {
  return authProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input, ctx }) => passkeyController.deletePasskey(ctx.auth, input.id));
}

function updatePasskeyName() {
  return authProcedure
    .input(z.object({ id: z.string(), friendlyName: z.string().min(1).max(100) }))
    .mutation(({ input, ctx }) => passkeyController.updatePasskeyName(ctx.auth, input.id, input.friendlyName));
}

export const AuthRouter = router({
  signUp: signUp(),
  signIn: signIn(),
  signOut: signOut(),
  currentUser: currentUser(),
  getAllWithCounts: getAllWithCounts(),
  getById: getById(),
  invite: invite(),
  update: update(),
  delete: deleteOne(),
  count: count(),
  resetPassword: resetPassword(),
  renewAuthToken: renewAuthToken(),
  sendPasswordResetEmail: sendPasswordResetEmail(),
  verifyEmail: verifyEmail(),
  resendVerificationEmail: resendVerificationEmail(),
  verify2FA: verify2FA(),
  scheduleAccountDeletion: scheduleAccountDeletion(),
  cancelAccountDeletion: cancelAccountDeletion(),
  cancelEmailChange: cancelEmailChange(),
  getTenantAccountStatus: getTenantAccountStatus(),
  scheduleTenantDeletion: scheduleTenantDeletion(),
  cancelTenantDeletion: cancelTenantDeletion(),
  cancelTenantDeletionByToken: cancelTenantDeletionByToken(),
  pauseTenant: pauseTenant(),
  resumeTenant: resumeTenant(),
  adminTriggerPasswordReset: adminTriggerPasswordReset(),
  uploadAvatar: uploadAvatar(),
  deleteAvatar: deleteAvatar(),
  passkeyRegistrationOptions: passkeyRegistrationOptions(),
  verifyPasskeyRegistration: verifyPasskeyRegistration(),
  passkeyAuthenticationOptions: passkeyAuthenticationOptions(),
  verifyPasskeyAuthentication: verifyPasskeyAuthentication(),
  listPasskeys: listPasskeys(),
  deletePasskey: deletePasskey(),
  updatePasskeyName: updatePasskeyName(),
});
