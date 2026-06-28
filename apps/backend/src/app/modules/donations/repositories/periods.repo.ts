import type { Selectable } from 'kysely';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { BaseRepository } from '../../../lib/base.repo';

export class DonationPeriodsRepo extends BaseRepository<'donation_periods'> {
  constructor() {
    super('donation_periods');
  }

  public async getAllForTenant(tenantId: string): Promise<Selectable<Models['donation_periods']>[]> {
    return this.db
      .selectFrom('donation_periods')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('start_date', 'desc')
      .execute();
  }

  /**
   * Return the single active period that covers today, or null if none defined.
   * If multiple active periods overlap today, returns the most recently started one.
   */
  public async getActivePeriodForToday(tenantId: string): Promise<Selectable<Models['donation_periods']> | null> {
    const today = new Date().toISOString().slice(0, 10);
    const row = await this.db
      .selectFrom('donation_periods')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .where('start_date', '<=', new Date(today))
      .where((eb) => eb.or([eb('end_date', 'is', null), eb('end_date', '>=', new Date(today))]))
      .orderBy('start_date', 'desc')
      .limit(1)
      .executeTakeFirst();

    return row ?? null;
  }
}
