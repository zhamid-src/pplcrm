import { BaseRepository } from './base.repo';

export class TenantsRepo extends BaseRepository<'tenants'> {
  constructor() {
    super('tenants');
  }
}
