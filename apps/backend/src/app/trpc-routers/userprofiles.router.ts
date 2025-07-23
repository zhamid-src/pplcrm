import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { UserProfilesController } from '../controllers/usersprofiles.controller';

const user = new UserProfilesController();

/**
 * Get a user profile by its ID.
 */
function getById() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => user.getById({ tenant_id: ctx.auth!.tenant_id!, id: input }));
}

/**
 * UserProfiles endpoints
 */
export const UserProfilesRouter = router({
  getById: getById(),
});
