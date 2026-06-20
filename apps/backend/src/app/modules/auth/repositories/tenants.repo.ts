import { BaseRepository } from '../../../lib/base.repo';

export class TenantsRepo extends BaseRepository<'tenants'> {
  constructor() {
    super('tenants');
  }
}
