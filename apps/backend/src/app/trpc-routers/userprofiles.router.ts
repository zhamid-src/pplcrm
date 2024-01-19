import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { UserProfilesController } from '../controllers/usersprofiles.controller';

const user = new UserProfilesController();

export const UserProfilesRouter = router({
  getById: authProcedure.input(z.string()).query(({ input }) => user.getById(BigInt(input))),
});
