import { idSchema } from '../../../../../../libs/common/src';

import { authProcedure, router } from '../../../trpc';
import { UserProfilesController } from './controller';

function getById() {
  return authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => user.getOneById({ tenant_id: ctx.auth.tenant_id, id: input }));
}

const user = new UserProfilesController();

export const UserProfilesRouter = router({
  getById: getById(),
});
