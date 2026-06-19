import { z } from 'zod';
import { idSchema } from '../../../../../../libs/common/src';
import { authProcedure, router } from '../../../trpc';
import { NotificationsController } from './controller';

const notifications = new NotificationsController();

export const NotificationsRouter = router({
  getLatest: authProcedure
    .input(
      z
        .object({
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
        .optional(),
    )
    .query(({ input, ctx }) => notifications.getLatest(ctx.auth, input?.limit, input?.offset)),

  getUnreadCount: authProcedure.query(({ ctx }) => notifications.getUnreadCount(ctx.auth)),

  markAllRead: authProcedure.mutation(({ ctx }) => notifications.markAllAsRead(ctx.auth)),

  markRead: authProcedure.input(idSchema).mutation(({ input, ctx }) => notifications.markRead(input, ctx.auth)),
});
