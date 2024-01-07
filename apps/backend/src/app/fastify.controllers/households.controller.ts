import { TableType } from 'common/src/lib/kysely.models';
import { HouseholdOperator } from '../db.operators/households.operator';
import { BaseController } from './base.controller';

/**
 * Households controller
 */
export class HouseholdsController extends BaseController<TableType.households> {
  constructor() {
    super(new HouseholdOperator());
  }
}
