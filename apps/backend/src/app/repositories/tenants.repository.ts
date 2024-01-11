import { BaseRepository } from './base.repository';

export class TenantsRepository extends BaseRepository<'tenants'> {
  constructor() {
    super('tenants');
  }
}
