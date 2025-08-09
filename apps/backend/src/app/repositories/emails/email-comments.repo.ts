import { BaseRepository } from '../base.repo';

/** Repository for email comments */
export class EmailCommentsRepo extends BaseRepository<'email_comments'> {
  constructor() {
    super('email_comments');
  }

  /** Retrieve comments for a specific email */
  public getForEmail(tenant_id: string, email_id: string) {
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('email_id', '=', email_id)
      .execute();
  }
}
