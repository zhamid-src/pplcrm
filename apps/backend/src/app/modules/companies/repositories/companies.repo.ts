import { BaseRepository } from '../../../lib/base.repo';

export class CompaniesRepo extends BaseRepository<'companies'> {
  constructor() {
    super('companies');
  }
}
