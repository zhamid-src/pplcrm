import { TableType } from '../tables/db.table';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController {
  constructor() {
    super(TableType.households);
  }
}
