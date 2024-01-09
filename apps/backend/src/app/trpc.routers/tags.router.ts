import { AddTagObj, UpdateTagObj } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { TagsHelper } from '../trpc.helper/tags.helper';

const tags = new TagsHelper();

export const TagsRouter = router({
  findOneByName: authProcedure.input(z.string()).query(({ input }) => tags.findOne(input)),
  findOne: authProcedure.input(z.bigint()).query(({ input }) => tags.findOne(input)),
  findAll: authProcedure.query(() => tags.findAll()),
  add: authProcedure.input(AddTagObj).mutation(({ input, ctx }) => tags.add(input, ctx.auth)),
  delete: authProcedure.input(z.number()).mutation(({ input }) => tags.delete(input)),
  update: authProcedure
    .input(z.object({ id: z.number(), data: UpdateTagObj }))
    .mutation(({ input, ctx }) => tags.update(input.id, input.data, ctx.auth)),
});
