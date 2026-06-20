import { BaseRepository } from '../../../lib/base.repo';

export class EmailBodiesRepo extends BaseRepository<'email_bodies'> {
  constructor() {
    super('email_bodies');
  }
}
