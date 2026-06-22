import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { idSchema, AddConnectionObj } from '../../../../../../libs/common/src';
import { PersonConnectionsController } from './controller';

const ctrl = new PersonConnectionsController();

export const PersonConnectionsRouter = router({
  getForPerson: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => ctrl.getForPerson(input, ctx.auth)),

  countForPerson: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => ctrl.countForPerson(input, ctx.auth)),

  add: authProcedure
    .input(z.object({ person_id: idSchema, data: AddConnectionObj }))
    .mutation(({ input, ctx }) => ctrl.addConnection(input.person_id, input.data, ctx.auth)),

  remove: authProcedure
    .input(idSchema)
    .mutation(({ input, ctx }) => ctrl.removeConnection(input, ctx.auth)),
});
