/**
 * Repository for accessing email attachments.
 */
import { sql } from 'kysely';

import { BaseRepository } from '../base.repo';
import { HasRow } from 'common/src/lib/emails';

/**
 * Data access for the `email_attachments` table.
 */
export class EmailAttachmentsRepo extends BaseRepository<'email_attachments'> {
  constructor() {
    super('email_attachments');
  }

  public getAllAttachments(tenant_id: string, email_id: string, opts?: { includeInline?: boolean }) {
    let q = this.selectBy('email_id', { tenant_id, value: email_id }).orderBy('pos', 'asc');

    if (!opts?.includeInline) q = q.where('is_inline', '=', false);

    return q.execute();
  }

  /** Get attachments for a given email ordered by position */
  public getByEmailId(tenant_id: string, email_id: string) {
    return this.getAllByColumn('email_id', { tenant_id, column: email_id });
  }

  /** Subquery: attachment counts grouped by email_id (for joins) */
  public getCountByEmails(tenant_id: string) {
    return this.getSelect()
      .select(['email_id'])
      .select(({ fn }) => fn.count('id').as('attachment_count'))
      .where('tenant_id', '=', tenant_id)
      .groupBy('email_id')
      .execute();
  }

  public getSelectForCountByEmails(tenant_id: string) {
    return this.getSelect()
      .select(['email_id'])
      .select(({ fn }) => fn.count('id').as('att_count'))
      .where('tenant_id', '=', tenant_id)
      .groupBy('email_id')
      .as('ea');
  }

  /** Fast existence check (no count) */
  public async hasAttachment(tenant_id: string, email_id: string): Promise<boolean> {
    const row = await this.getSelect()
      .select(({ val }) => val(1).as('one'))
      .where('tenant_id', '=', tenant_id)
      .where('email_id', '=', email_id)
      .limit(1)
      .executeTakeFirst();
    return !!row;
  }

  public hasAttachmentByEmailIds(tenant_id: string, ids: string[]): Promise<HasRow[]> {
    if (!ids?.length) return Promise.resolve([]);

    return this.getSelect()
      .select(['email_id'])
      .select(() => sql<boolean>`count(id) > 0`.as('has'))
      .where('tenant_id', '=', tenant_id)
      .where('email_id', 'in', ids)
      .groupBy('email_id')
      .execute() as Promise<HasRow[]>;
  }
}
