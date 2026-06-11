import { AddListObj, UpdateListObj, idSchema } from '@common';
import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { ListsController } from './controller';
import { createCrudRouter } from '../../lib/crud-router';

const lists = new ListsController();

const crud = createCrudRouter(lists, AddListObj, UpdateListObj);

export const ListsRouter = router({
  ...crud,

  getAll: authProcedure.query(({ ctx }) => lists.getAll(ctx.auth.tenant_id)),

  add: authProcedure.input(AddListObj).mutation(({ input, ctx }) => lists.addList(input, ctx.auth)),

  update: authProcedure
    .input(z.object({ id: idSchema, data: UpdateListObj }))
    .mutation(({ input, ctx }) => lists.updateList(input.id, input.data, ctx.auth)),

  getMembersHouseholds: authProcedure.input(idSchema).query(({ input, ctx }) => lists.getHouseholdsByListId(ctx.auth, input)),

  getMembersPersons: authProcedure.input(idSchema).query(({ input, ctx }) => lists.getPersonsByListId(ctx.auth, input)),

  refresh: authProcedure.input(idSchema).mutation(({ input, ctx }) => lists.refreshList(ctx.auth, input)),

  getListStats: authProcedure.input(idSchema).query(({ input, ctx }) => lists.getListStats(ctx.auth, input)),

  getMemberCount: authProcedure.input(idSchema).query(({ input, ctx }) => lists.getMemberCount(ctx.auth, input)),
});
