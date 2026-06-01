import { BaseRepository } from '../../../lib/base.repo';
import { Transaction } from 'kysely';
import { Models, OperationDataType } from 'common/src/lib/kysely.models';

export class NotificationsRepo extends BaseRepository<'notifications'> {
  constructor() {
    super('notifications');
  }

  public async getUnreadCount(tenant_id: string, user_id: string, trx?: Transaction<Models>): Promise<number> {
    const res = await this.getSelect(trx)
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', tenant_id)
      .where('user_id', '=', user_id)
      .where('read', '=', false)
      .executeTakeFirst();
    return Number((res as any)?.count || 0);
  }

  public async getLatestForUser(tenant_id: string, user_id: string, limit = 20, offset = 0, trx?: Transaction<Models>) {
    let query = this.getSelect(trx)
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('user_id', '=', user_id)
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (offset > 0) {
      query = query.offset(offset);
    }

    return query.execute();
  }

  public async markAllRead(tenant_id: string, user_id: string, trx?: Transaction<Models>) {
    return this.getUpdate(trx)
      .set({ read: true })
      .where('tenant_id', '=', tenant_id)
      .where('user_id', '=', user_id)
      .where('read', '=', false)
      .execute();
  }

  public async pushNotification(
    input: {
      tenant_id: string;
      user_id: string;
      title: string;
      message: string;
      type: string;
      link?: string | null;
    },
    trx?: Transaction<Models>,
  ) {
    const row = {
      tenant_id: input.tenant_id,
      user_id: input.user_id,
      title: input.title,
      message: input.message,
      type: input.type,
      read: false,
      link: input.link ?? null,
    } as OperationDataType<'notifications', 'insert'>;
    return this.add({ row }, trx);
  }
}
