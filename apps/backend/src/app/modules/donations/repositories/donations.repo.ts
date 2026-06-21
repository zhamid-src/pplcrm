import { Selectable } from 'kysely';
import { BaseRepository } from '../../../lib/base.repo';
import { Models } from '../../../../../../../libs/common/src/lib/kysely.models';

export class DonationsRepo extends BaseRepository<'donations'> {
  constructor() {
    super('donations');
  }

  /**
   * Get the cumulative sum of successful donations for a person in a given year.
   * Amounts are represented in cents.
   */
  public async getPersonCumulativeDonations(tenantId: string, personId: string, year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const result = await this.getSelect()
      .select(({ fn }) => [fn.sum<string | number>('amount').as('total')])
      .where('tenant_id', '=', tenantId as any)
      .where('person_id', '=', personId as any)
      .where('status', '=', 'succeeded')
      .where('created_at', '>=', startOfYear)
      .where('created_at', '<=', endOfYear)
      .executeTakeFirst();

    return Number(result?.total || 0);
  }

  /**
   * Retrieve the list of donations for a given person, ordered by date descending.
   */
  public async getPersonDonationsList(tenantId: string, personId: string): Promise<Selectable<Models['donations']>[]> {
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenantId as any)
      .where('person_id', '=', personId as any)
      .orderBy('created_at', 'desc')
      .execute();
  }
}
