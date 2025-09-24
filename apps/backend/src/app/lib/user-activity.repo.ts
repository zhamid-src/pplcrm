import { SelectQueryBuilder } from "kysely";

import { BaseRepository } from "./base.repo";
import { Models, OperationDataType } from "common/src/lib/kysely.models";

export class UserActivityRepo extends BaseRepository<'user_activity'> {
  constructor() {
    super('user_activity');
  }

  public async getStats(input: { tenant_id: string; user_id: string }) {
    const results = await (this.getSelect() as SelectQueryBuilder<Models, 'user_activity', any>)
      .select('activity')
      .select((eb) => [
        eb.fn.count('id').as('count'),
        eb.fn.sum('quantity').as('total_quantity'),
        eb.fn.max('created_at').as('last_activity_at'),
      ])
      .where('tenant_id', '=', input.tenant_id)
      .where('user_id', '=', input.user_id)
      .groupBy('activity')
      .execute();

    const mapped: Record<string, { count: number; total_quantity: number; last_activity_at: Date | null }> = {};
    for (const row of results) {
      const activity = String(row['activity'] ?? '');
      if (!activity) continue;
      const count = Number((row as any).count ?? 0);
      const totalQtyRaw = (row as any).total_quantity;
      const total_quantity = totalQtyRaw == null ? 0 : Number(totalQtyRaw);
      const lastAtValue = (row as any).last_activity_at ?? null;
      const last_activity_at = lastAtValue ? new Date(lastAtValue) : null;
      mapped[activity] = { count, total_quantity, last_activity_at };
    }
    return mapped;
  }

  public async log(input: {
    tenant_id: string;
    user_id: string;
    activity: UserActivityType;
    entity: string;
    quantity?: number | null;
    metadata?: Record<string, unknown> | null;
    performed_by?: string | null;
  }) {
    const actor = input.performed_by ?? input.user_id;
    const row = {
      tenant_id: input.tenant_id,
      user_id: input.user_id,
      activity: input.activity,
      entity: input.entity,
      quantity: input.quantity ?? 0,
      metadata: input.metadata ?? null,
      createdby_id: actor,
      updatedby_id: actor,
    } as OperationDataType<'user_activity', 'insert'>;
    await this.add({ row });
  }
}

export type UserActivityType = 'import' | 'export';
