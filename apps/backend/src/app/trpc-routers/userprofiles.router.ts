import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { UserProfilesController } from '../controllers/usersprofiles.controller';

const user = new UserProfilesController();

export const UserProfilesRouter = router({
  findOne: authProcedure.input(z.string()).query(({ input }) => {
    return user.findOne(BigInt(input));
  }),
});
