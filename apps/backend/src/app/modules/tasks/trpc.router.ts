import { AddTaskObj, UpdateTaskObj, getAllOptions } from '@common';
import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { TasksController } from './controller';

const tasks = new TasksController();

export const TasksRouter = router({
  add: authProcedure.input(AddTaskObj).mutation(({ input, ctx }) => tasks.addTask(input, ctx.auth)),
  count: authProcedure.query(({ ctx }) => tasks.getCount(ctx.auth.tenant_id)),
  delete: authProcedure.input(z.string()).mutation(({ input, ctx }) => tasks.delete(ctx.auth.tenant_id, input)),
  deleteMany: authProcedure
    .input(z.array(z.string()))
    .mutation(({ input, ctx }) => tasks.deleteMany(ctx.auth.tenant_id, input)),
  getAll: authProcedure.input(getAllOptions).query(({ input, ctx }) => tasks.getAllTasks(ctx.auth, input)),
  getById: authProcedure
    .input(z.string())
    .query(({ input, ctx }) => tasks.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),
  update: authProcedure
    .input(z.object({ id: z.string(), data: UpdateTaskObj }))
    .mutation(({ input, ctx }) => tasks.updateTask(input.id, input.data, ctx.auth)),
});
