import { TableType } from '../kyselySchema/db.schema';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController {
  constructor() {
    super(TableType.households);
  }
}
