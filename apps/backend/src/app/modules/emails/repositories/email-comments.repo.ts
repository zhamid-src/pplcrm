import { BaseRepository } from '../../../lib/base.repo';

export class EmailCommentsRepo extends BaseRepository<'email_comments'> {
  constructor() {
    super('email_comments');
  }

  public getForEmail(tenant_id: string, email_id: string) {
    return this.getManyBy('email_id', { tenant_id, value: email_id });
  }
}
