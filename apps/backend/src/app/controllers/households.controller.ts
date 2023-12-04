import { TableType } from '../kysely.models';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController<TableType.households> {
  constructor() {
    super(TableType.households);
  }
}
