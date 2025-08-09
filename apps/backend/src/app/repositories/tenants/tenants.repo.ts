import { BaseRepository } from '../base.repo';

/**
 * Repository for interacting with the `tenants` table.
 */
export class TenantsRepo extends BaseRepository<'tenants'> {
  constructor() {
    super('tenants');
  }
}
