import { AddTagObj, UpdateTagObj } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../trpc';
import { TagsHelper } from '../trpc.handler/tags.helper';

const tags = new TagsHelper();

export const tagsRouter = router({
  findOneByName: authProcedure.input(z.string()).query(({ input }) => {
    return tags.findOne(input);
  }),
  findOne: authProcedure.input(z.bigint()).query(({ input }) => {
    return tags.findOne(input);
  }),
  findAll: authProcedure.query(() => {
    return tags.findAll();
  }),
  add: authProcedure.input(AddTagObj).mutation(({ input, ctx }) => tags.add(input, ctx.auth)),
  update: authProcedure
    .input(z.object({ id: z.number(), data: UpdateTagObj }))
    .mutation(({ input, ctx }) => tags.update(input.id, input.data, ctx.auth)),
  delete: authProcedure.input(z.number()).mutation(({ input }) => tags.delete(input)),
});

export type TagssRouter = typeof tagsRouter;
