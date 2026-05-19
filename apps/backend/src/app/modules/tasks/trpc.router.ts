import { AddTaskObj, UpdateTaskObj, exportCsvInput, exportCsvResponse, getAllOptions, idSchema } from '@common';
import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { TasksController } from './controller';
import { TaskCommentsController } from './comments.controller';
import { TaskAttachmentsController } from './attachments.controller';
import { TaskSubtasksController } from './subtasks.controller';

const tasks = new TasksController();

export const TasksRouter = router({
  add: authProcedure.input(AddTaskObj).mutation(({ input, ctx }) => tasks.addTask(input, ctx.auth)),
  count: authProcedure.query(({ ctx }) => tasks.getCount(ctx.auth.tenant_id)),
  delete: authProcedure.input(idSchema).mutation(({ input, ctx }) => tasks.delete(ctx.auth.tenant_id, input)),
  deleteMany: authProcedure
    .input(z.array(idSchema).min(1, 'At least one ID is required'))
    .mutation(({ input, ctx }) => tasks.deleteMany(ctx.auth.tenant_id, input)),
  getAll: authProcedure.input(getAllOptions).query(({ input, ctx }) => tasks.getAllTasks(ctx.auth, input)),
  getArchived: authProcedure.input(getAllOptions).query(({ input, ctx }) => tasks.getArchivedTasks(ctx.auth, input)),
  exportCsv: authProcedure
    .input(exportCsvInput)
    .output(exportCsvResponse)
    .mutation(({ input, ctx }) => tasks.exportCsv({ tenant_id: ctx.auth.tenant_id, ...(input ?? {}) }, ctx.auth)),
  getById: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => tasks.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),
  update: authProcedure
    .input(z.object({ id: idSchema, data: UpdateTaskObj }))
    .mutation(({ input, ctx }) => tasks.updateTask(input.id, input.data, ctx.auth)),
  getComments: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => new TaskCommentsController().getByTaskId({ tenant_id: ctx.auth.tenant_id, task_id: input })),
  addComment: authProcedure
    .input(z.object({ task_id: idSchema, comment: z.string().trim().min(1, 'Comment cannot be empty').max(5000, 'Comment too long') }))
    .mutation(({ input, ctx }) =>
      (new TaskCommentsController() as any).add({
        tenant_id: ctx.auth.tenant_id,
        task_id: input.task_id,
        author_id: ctx.auth.user_id,
        comment: input.comment,
      }),
    ),
  getAttachments: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => new TaskAttachmentsController().getByTaskId({ tenant_id: ctx.auth.tenant_id, task_id: input })),
  addAttachment: authProcedure
    .input(
      z.object({
        task_id: idSchema,
        filename: z.string().trim().min(1, 'Filename cannot be empty').max(255, 'Filename is too long'),
        url: z.string().url('Invalid URL format').optional(),
        content_type: z.string().trim().max(100).optional(),
        size_bytes: z.number().int().nonnegative().optional(),
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
  getSubtasks: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => new TaskSubtasksController().getByTaskId({ tenant_id: ctx.auth.tenant_id, task_id: input })),
  addSubtask: authProcedure
    .input(z.object({ task_id: idSchema, name: z.string().trim().min(1, 'Subtask name cannot be empty').max(200, 'Subtask name too long') }))
    .mutation(({ input, ctx }) =>
      (new TaskSubtasksController() as any).add({
        tenant_id: ctx.auth.tenant_id,
        task_id: input.task_id,
        name: input.name,
        status: 'todo',
        createdby_id: ctx.auth.user_id,
        updatedby_id: ctx.auth.user_id,
      }),
    ),
  updateSubtask: authProcedure
    .input(
      z.object({
        id: idSchema,
        data: z.object({
          name: z.string().trim().min(1, 'Subtask name cannot be empty').max(200, 'Subtask name too long').optional(),
          status: z.string().trim().max(50).optional(),
          position: z.number().int().optional(),
        }),
      }),
    )
    .mutation(({ input, ctx }) => new TaskSubtasksController().updateSubtask({ tenant_id: ctx.auth.tenant_id, id: input.id, row: input.data as any })),
});
