import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { UserProfilesHelper } from '../controllers/usersprofiles.controller';

const user = new UserProfilesHelper();

export const UserProfilesRouter = router({
  findOne: authProcedure.input(z.bigint()).query(({ input }) => {
    return user.findOne(input);
  }),
});
