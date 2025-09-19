import { BaseController } from '../../lib/base.controller';
import { NewslettersRepo } from './repositories/newsletters.repo';

export class NewslettersController extends BaseController<'newsletters', NewslettersRepo> {
  constructor() {
    super(new NewslettersRepo());
  }
}
