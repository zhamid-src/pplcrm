/**
 * tRPC router exposing endpoints for managing user profile data.
 */
import { idSchema } from '../../../../../../libs/common/src';

import { authProcedure, router } from '../../../trpc';
import { UserProfilesController } from './controller';

/**
 * Get a user profile by its ID.
 */
function getById() {
  return authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => user.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }));
}

const user = new UserProfilesController();

/**
 * UserProfiles endpoints
 */
export const UserProfilesRouter = router({
  getById: getById(),
});
