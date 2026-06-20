import { UpdateAuthUserObj, idSchema } from '../../../../../../libs/common/src';

import z from 'zod';

import { authProcedure, router } from '../../../trpc';
import { AuthController } from '../auth/controller';

const controller = new AuthController();

function getUsers() {
  return authProcedure.query(({ ctx }) => controller.getUsersList(ctx.auth));
}

function getProfileById() {
  return authProcedure.input(idSchema).query(({ input, ctx }) => controller.getUserById(ctx.auth, input));
}

function updateUserProfile() {
  return authProcedure
    .input(z.object({ id: idSchema, data: UpdateAuthUserObj }))
    .mutation(({ input, ctx }) => controller.updateUser(ctx.auth, input.id, input.data));
}

export const UsersRouter = router({
  getUsers: getUsers(),
  getProfileById: getProfileById(),
  updateUserProfile: updateUserProfile(),
});
