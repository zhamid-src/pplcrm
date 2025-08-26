/**
 * Repository for tenant records.
 */
import { BaseRepository } from '../../../lib/base.repo';

/**
 * Data access object for the `tenants` table.
 */
export class TenantsRepo extends BaseRepository<'tenants'> {
  /**
   * Creates a repository instance for the `tenants` table.
   */
  constructor() {
    super('tenants');
  }
}
