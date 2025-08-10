/**
 * Data access layer for email message records.
 */
import { BaseRepository } from '../base.repo';

/**
 * Repository for the `emails` table.
 */
export class EmailRepo extends BaseRepository<'emails'> {
  /**
   * Creates a repository instance for the `emails` table.
   */
  constructor() {
    super('emails');
  }

  /**
   * Get all emails within a folder for a given tenant.
   *
   * @param tenant_id - Tenant that owns the emails.
   * @param folder_id - Identifier of the folder to retrieve emails from.
   * @returns List of email rows in the folder.
   */
  public getByFolder(tenant_id: string, folder_id: string) {
    return this.getSelect().selectAll().where('tenant_id', '=', tenant_id).where('folder_id', '=', folder_id).execute();
  }
}
