import { Selectable, sql } from 'kysely';
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

  /**
   * Retrieve all donations for a tenant, joined with donor person details, ordered by date descending.
   * Uses a LEFT JOIN so donations whose contact was later deleted (person_id = NULL) are still returned.
   * The donor snapshot columns (donor_first_name / donor_last_name / donor_email) captured at the time
   * of donation are used as the fallback for display and tax receipt issuance.
   */
  public async getTenantDonationsList(tenantId: string) {
    return this.db
      .selectFrom('donations')
      .leftJoin('persons', 'persons.id', 'donations.person_id')
      .select([
        'donations.id',
        'donations.tenant_id',
        'donations.person_id',
        'donations.amount',
        'donations.status',
        'donations.stripe_session_id',
        'donations.tax_credit_amount',
        'donations.residency_province',
        'donations.residency_country',
        'donations.created_at',
        // Live contact details when the person still exists; fall back to the
        // immutable snapshot recorded at donation time when they have been deleted.
        // sql<> raw refs are used because the new columns are added via a migration
        // and may not yet be reflected in the generated Kysely Models type.
        this.db.fn.coalesce('persons.first_name', sql<string>`donations.donor_first_name`).as('person_first_name'),
        this.db.fn.coalesce('persons.last_name',  sql<string>`donations.donor_last_name`).as('person_last_name'),
        this.db.fn.coalesce('persons.email',       sql<string>`donations.donor_email`).as('person_email'),
      ])
      .where('donations.tenant_id', '=', tenantId as any)
      .orderBy('donations.created_at', 'desc')
      .execute();
  }
}
