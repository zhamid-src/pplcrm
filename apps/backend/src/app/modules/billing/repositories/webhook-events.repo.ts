import { BaseRepository } from '../../../lib/base.repo';

export class WebhookEventsRepo extends BaseRepository<'webhook_events'> {
  constructor() {
    super('webhook_events');
  }
}
