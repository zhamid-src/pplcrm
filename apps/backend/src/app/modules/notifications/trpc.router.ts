import { idSchema } from '@common';
import { authProcedure, router } from '../../../trpc';
import { NotificationsController } from './controller';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';

const notifications = new NotificationsController();

export const NotificationsRouter = router({
  getLatest: authProcedure
    .query(wrapTrpc(({ ctx }) => notifications.getLatest(ctx.auth))),
  
  getUnreadCount: authProcedure
    .query(wrapTrpc(({ ctx }) => notifications.getUnreadCount(ctx.auth))),
  
  markAllRead: authProcedure
    .mutation(wrapTrpc(({ ctx }) => notifications.markAllAsRead(ctx.auth))),
  
  markRead: authProcedure
    .input(idSchema)
    .mutation(wrapTrpc(({ input, ctx }) => notifications.markRead(input, ctx.auth))),
});
