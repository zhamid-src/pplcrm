/**
 * tRPC router exposing endpoints for managing user account list, profile viewing,
 * and profile updates.
 */
import { UpdateAuthUserObj, idSchema } from '@common';

import z from 'zod';

import { authProcedure, router } from '../../../trpc';
import { AuthController } from '../auth/controller';

const controller = new AuthController();

/**
 * Retrieve all users for the current tenant.
 */
function getUsers() {
  return authProcedure.query(({ ctx }) => controller.getUsersList(ctx.auth));
}

/**
 * Retrieve a specific user profile by ID.
 */
function getProfileById() {
  return authProcedure.input(idSchema).query(({ input, ctx }) => controller.getUserById(ctx.auth, input));
}

/**
 * Update an existing user's profile details.
 */
function updateUserProfile() {
  return authProcedure
    .input(z.object({ id: idSchema, data: UpdateAuthUserObj }))
    .mutation(({ input, ctx }) => controller.updateUser(ctx.auth, input.id, input.data));
}

/**
 * UsersRouter endpoints
 */
export const UsersRouter = router({
  getUsers: getUsers(),
  getProfileById: getProfileById(),
  updateUserProfile: updateUserProfile(),
});
