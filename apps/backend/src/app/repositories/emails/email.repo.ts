import { BaseRepository } from '../base.repo';

/** Repository for email records */
export class EmailRepo extends BaseRepository<'emails'> {
  constructor() {
    super('emails');
  }

  /** Get all emails within a folder for a tenant */
  public getByFolder(tenant_id: string, folder_id: string) {
    return this.getSelect()
      .selectAll()
      .where('tenant_id', '=', tenant_id)
      .where('folder_id', '=', folder_id)
      .execute();
  }
}
