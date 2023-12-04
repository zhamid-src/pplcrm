import { HouseholdOperator } from '../db.operators/households.operator';
import { TableType } from '../kysely.models';
import { BaseController } from './base.controller';

export class HouseholdsController extends BaseController<TableType.households> {
  constructor() {
    super(new HouseholdOperator());
  }
}
