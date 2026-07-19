import { BaseRepository } from '../../../lib/base.repo';

/**
 * User-saved newsletter templates: a tenant-wide reusable-design library.
 * No campaign scoping (Campaigns §15 — pure content is a shared asset).
 */
export class NewsletterTemplatesRepo extends BaseRepository<'newsletter_templates'> {
  constructor() {
    super('newsletter_templates');
  }

  /** Every saved template for the tenant, alphabetized so the wizard's list is scannable. */
  public getAllByName(tenant_id: string) {
    return this.db
      .selectFrom('newsletter_templates')
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .orderBy('name', 'asc')
      .execute();
  }
}
