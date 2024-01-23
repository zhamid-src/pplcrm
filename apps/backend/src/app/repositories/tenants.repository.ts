import { BaseRepository } from './base.repository';

export class TenantsRepo extends BaseRepository<'tenants'> {
  constructor() {
    super('tenants');
  }
}
