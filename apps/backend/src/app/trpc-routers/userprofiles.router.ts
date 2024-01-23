import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { UserProfilesController } from '../controllers/usersprofiles.controller';

const user = new UserProfilesController();

/**
 * UserProfiles endpoints
 */
export const UserProfilesRouter = router({
  getById: getById(),
});

function getById() {
  return authProcedure.input(z.string()).query(({ input }) => user.getById(BigInt(input)));
}
