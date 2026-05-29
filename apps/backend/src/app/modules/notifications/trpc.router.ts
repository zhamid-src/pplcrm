import { idSchema } from '@common';
import { authProcedure, router } from '../../../trpc';
import { NotificationsController } from './controller';

const notifications = new NotificationsController();

export const NotificationsRouter = router({
  getLatest: authProcedure
    .query(({ ctx }) => notifications.getLatest(ctx.auth)),
  
  getUnreadCount: authProcedure
    .query(({ ctx }) => notifications.getUnreadCount(ctx.auth)),
  
  markAllRead: authProcedure
    .mutation(({ ctx }) => notifications.markAllAsRead(ctx.auth)),
  
  markRead: authProcedure
    .input(idSchema)
    .mutation(({ input, ctx }) => notifications.markRead(input, ctx.auth)),
});
