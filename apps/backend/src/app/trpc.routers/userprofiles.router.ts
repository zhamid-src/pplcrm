import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { UserProfilesHelper } from '../trpc.helper/usersprofiles.helpers';

const user = new UserProfilesHelper();

export const UserProfilesRouter = router({
  findOne: authProcedure.input(z.bigint()).query(({ input }) => {
    return user.findOne(input);
  }),
});
