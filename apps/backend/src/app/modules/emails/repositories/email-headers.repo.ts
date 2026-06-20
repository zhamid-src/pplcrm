import { BaseRepository } from '../../../lib/base.repo';

export class EmailHeadersRepo extends BaseRepository<'email_headers'> {
  constructor() {
    super('email_headers');
  }

  public getByEmailId(tenant_id: string, email_id: string) {
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('email_id', '=', email_id)
      .executeTakeFirst();
  }
}
