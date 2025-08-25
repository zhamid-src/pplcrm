/**
 * Repository for reading and writing email recipient records.
 */
import { OperandValueExpressionOrList, Transaction, sql } from 'kysely';

import { BaseRepository } from '../base.repo';
import { Models, TypeId, TypeTenantId } from 'common/src/lib/kysely.models';

/**
 * Data access for the `email_recipients` table.
 */
export class EmailTrashRepo extends BaseRepository<'email_trash'> {
  /**
   * Creates a repository instance for the `email_recipients` table.
   */
  constructor() {
    super('email_trash');
  }

  /**
   * Insert email_trash rows for a set of emails by selecting from `emails`.
   * - Remembers the previous folder (from_folder_id)
   * - Skips emails already in Trash
   * - Idempotent via ON CONFLICT (tenant_id, email_id) DO NOTHING
   * - Returns all inserted rows
   */
  public async addFromEmails(
    input: {
      tenant_id: string; // match your DB type (uuid/bigint as string is fine)
      emailIds: string[];
      folder_id: string;
      actorUserId?: string; // optional audit user
    },
    trx?: Transaction<Models>,
  ) {
    const { tenant_id, emailIds, folder_id, actorUserId } = input;
    if (!emailIds?.length) return [];

    // Build the INSERT ... SELECT
    const rows = await this.getInsert(trx)
      .columns([
        'tenant_id',
        'email_id',
        'from_folder_id',
        // include audit fields if present in your schema:
        ...(actorUserId ? (['createdby_id', 'updatedby_id'] as const) : []),
      ])
      .expression((eb) => {
        const sel = eb
          .selectFrom('emails')
          .select([
            // Use a constant for tenant_id to avoid type surprises
            sql`${tenant_id}`.as('tenant_id'),
            sql`id`.as('email_id'),
            sql`folder_id`.as('from_folder_id'),
          ])
          .where('tenant_id', '=', tenant_id as any)
          .where('id', 'in', emailIds as any)
          .where('folder_id', '!=', folder_id as any);

        // tack on audit user if requested
        return actorUserId
          ? sel.select([sql`${actorUserId}`.as('createdby_id'), sql`${actorUserId}`.as('updatedby_id')])
          : sel;
      })
      .onConflict((oc) => oc.columns(['tenant_id', 'email_id']).doNothing())
      .returningAll()
      .execute();

    return rows as unknown as Models['email_trash'][];
  }

  public override async deleteMany(
    input: { tenant_id: TypeTenantId<'email_trash'>; ids: TypeId<'email_trash'>[] },
    trx?: Transaction<Models>,
  ) {
    if (!input.ids?.length) return Promise.resolve(false);

    // Convert to numbers if needed
    const numericIds = input.ids as OperandValueExpressionOrList<Models, 'email_trash', 'email_id'>;

    const deleteQuery = this.getDelete(trx);
    const result = await deleteQuery
      .where('email_id', 'in', numericIds)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();

    return Number(result?.numDeletedRows ?? 0) > 0;
  }

  /**
   * Get email_trash rows by tenant and email ID.
   * Returns the original folder ID (from_folder_id) for each email.
   */
  public override getById(input: { tenant_id: string; id: string }, trx?: Transaction<Models>) {
    return this.getSelect(trx)
      .select(['email_id', 'from_folder_id'])
      .where('tenant_id', '=', input.tenant_id)
      .where('email_id', '=', input.id)
      .execute();
  }
}
