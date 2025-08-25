/**
 * tRPC router exposing endpoints for managing user profile data.
 */
import { z } from 'zod';

import { authProcedure, router } from '../../trpc';
import { UserProfilesController } from '../controllers/usersprofiles.controller';

/**
 * Get a user profile by its ID.
 */
function getById() {
  return authProcedure
    .input(z.string())
    .query(({ input, ctx }) => user.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }));
}

const user = new UserProfilesController();

/**
 * UserProfiles endpoints
 */
export const UserProfilesRouter = router({
  getById: getById(),
});
