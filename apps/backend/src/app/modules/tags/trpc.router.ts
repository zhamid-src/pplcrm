import { AddTagObj, UpdateTagObj } from '@common';
import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { TagsController } from './controller';
import { createCrudRouter } from '../../lib/crud-router';

const tags = new TagsController();

const crud = createCrudRouter(tags, AddTagObj, UpdateTagObj);

export const TagsRouter = router({
  ...crud,

  add: authProcedure.input(AddTagObj).mutation(({ input, ctx }) => tags.addTag(input, ctx.auth)),

  findByName: authProcedure
    .input(
      z.object({
        name: z.string().trim().max(100, 'Search term too long'),
        type: z.enum(['tag', 'issue']).default('tag').optional(),
      })
    )
    .query(({ input, ctx }) => tags.findByName(input, ctx.auth)),
});
