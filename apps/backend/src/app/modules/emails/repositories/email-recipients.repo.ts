import { BaseRepository } from '../../../lib/base.repo';

export class EmailRecipientsRepo extends BaseRepository<'email_recipients'> {
  constructor() {
    super('email_recipients');
  }

  public getByEmailId(tenant_id: string, email_id: string) {
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('email_id', '=', email_id)
      .orderBy('kind')
      .orderBy('pos')
      .execute();
  }

  public getByEmailIdAndKind(tenant_id: string, email_id: string, kind: 'to' | 'cc' | 'bcc') {
    return this.getSelect()
      .select(['name', 'email', 'pos'])
      .where('tenant_id', '=', tenant_id)
      .where('email_id', '=', email_id)
      .where('kind', '=', kind)
      .orderBy('pos')
      .execute();
  }
}
