import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { UserProfilesController } from '../controllers/usersprofiles.controller';

function getById() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => user.getById(ctx.auth!.tenant_id!, input));
}

const user = new UserProfilesController();
/**
 * UserProfiles endpoints
 */
export const UserProfilesRouter = router({
  getById: getById(),
});
