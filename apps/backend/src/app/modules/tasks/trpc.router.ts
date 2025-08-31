import { AddTaskObj, UpdateTaskObj, getAllOptions } from '@common';
import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { TasksController } from './controller';
import { TaskCommentsController } from './comments.controller';
import { TaskAttachmentsController } from './attachments.controller';

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
  getComments: authProcedure
    .input(z.string())
    .query(({ input, ctx }) => new TaskCommentsController().getByTaskId({ tenant_id: ctx.auth.tenant_id, task_id: input })),
  addComment: authProcedure
    .input(z.object({ task_id: z.string(), comment: z.string().min(1) }))
    .mutation(({ input, ctx }) =>
      (new TaskCommentsController() as any).add({
        tenant_id: ctx.auth.tenant_id,
        task_id: input.task_id,
        author_id: ctx.auth.user_id,
        comment: input.comment,
      }),
    ),
  getAttachments: authProcedure
    .input(z.string())
    .query(({ input, ctx }) => new TaskAttachmentsController().getByTaskId({ tenant_id: ctx.auth.tenant_id, task_id: input })),
  addAttachment: authProcedure
    .input(
      z.object({
        task_id: z.string(),
        filename: z.string().min(1),
        url: z.string().url().optional(),
        content_type: z.string().optional(),
        size_bytes: z.number().int().optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      (new TaskAttachmentsController() as any).add({
        tenant_id: ctx.auth.tenant_id,
        task_id: input.task_id,
        filename: input.filename,
        url: input.url,
        content_type: input.content_type,
        size_bytes: (input.size_bytes as any) ?? null,
        createdby_id: ctx.auth.user_id,
        updatedby_id: ctx.auth.user_id,
      }),
    ),
});
